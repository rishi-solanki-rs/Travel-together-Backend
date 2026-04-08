import { randomUUID } from 'node:crypto';
import QueueDeadLetter from '../../shared/models/QueueDeadLetter.model.js';
import { getRedisClient } from '../../config/redis.js';
import logger from '../../utils/logger.js';
import { incrementCounter, startTimer } from '../metrics/metrics.service.js';
import { emitAlert } from '../alerts/alerting.service.js';
import { getCorrelationId } from '../../shared/context/requestContext.js';
import { encryptText, decryptText } from '../security/runtimeSecurity.service.js';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

const calculateBackoffDelay = (attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS) => baseDelayMs * (2 ** Math.max(0, attempt - 1));

const enqueueJob = async (queueName, jobName, payload, options = {}) => {
  const correlationId = options.correlationId || getCorrelationId() || 'missing-correlation-id';
  const job = {
    id: randomUUID(),
    queueName,
    jobName,
    payload,
    attempts: 0,
    maxAttempts: options.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    baseDelayMs: options.baseDelayMs || DEFAULT_BASE_DELAY_MS,
    poisonThreshold: options.poisonThreshold || 10,
    correlationId,
    createdAt: new Date().toISOString(),
  };

  try {
    const stop = startTimer('tii_queue_enqueue_duration_ms', { queue: queueName, job: jobName });
    await getRedisClient().lpush(`queue:${queueName}`, JSON.stringify(job));
    stop();
    incrementCounter('tii_queue_enqueued_total', 1, { queue: queueName, job: jobName });
  } catch (error) {
    logger.warn({ err: error?.message, queueName, jobName }, 'Queue enqueue failed, proceeding best-effort');
  }

  return job;
};

const moveToDlq = async (job, error, options = {}) => {
  const encryptedPayload = encryptText(JSON.stringify(job.payload || {}));
  const dlqRecord = await QueueDeadLetter.create({
    queueName: job.queueName,
    jobName: job.jobName,
    payload: { encrypted: true, value: encryptedPayload },
    errorMessage: String(error?.message || error || 'unknown error'),
    attempts: job.attempts,
    quarantined: job.attempts >= (options.poisonThreshold || job.poisonThreshold || 10),
    correlationId: job.correlationId,
  });

  incrementCounter('tii_dlq_events_total', 1, { queue: job.queueName, job: job.jobName });

  if (dlqRecord.quarantined) {
    await emitAlert({
      policy: 'poison-message-quarantine',
      value: dlqRecord.attempts,
      threshold: options.poisonThreshold || job.poisonThreshold || 10,
      summary: `Poison message quarantined in ${job.queueName}/${job.jobName}`,
      severity: 'critical',
      context: { dlqId: dlqRecord._id, correlationId: job.correlationId },
    });
  }

  return dlqRecord;
};

const executeWithRetry = async (job, handler, options = {}) => {
  const maxAttempts = options.maxAttempts || job.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs || job.baseDelayMs || DEFAULT_BASE_DELAY_MS;
  const poisonThreshold = options.poisonThreshold || job.poisonThreshold || 10;

  while (job.attempts < maxAttempts) {
    job.attempts += 1;
    try {
      const stop = startTimer('tii_queue_job_duration_ms', { queue: job.queueName, job: job.jobName, attempt: job.attempts });
      const result = await handler(job);
      stop();
      incrementCounter('tii_queue_processed_total', 1, { queue: job.queueName, job: job.jobName });
      return { ok: true, result };
    } catch (error) {
      incrementCounter('tii_queue_failures_total', 1, { queue: job.queueName, job: job.jobName });
      if (job.attempts >= maxAttempts) {
        const dlq = await moveToDlq(job, error, { poisonThreshold });
        return { ok: false, dlq };
      }
      const delay = calculateBackoffDelay(job.attempts, baseDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const dlq = await moveToDlq(job, new Error('retry exhausted'), { poisonThreshold });
  return { ok: false, dlq };
};

const replayDeadLetter = async (dlqId, handler) => {
  const record = await QueueDeadLetter.findById(dlqId);
  if (!record) throw new Error('DLQ record not found');

  const job = {
    id: randomUUID(),
    queueName: record.queueName,
    jobName: record.jobName,
    payload: record?.payload?.encrypted
      ? JSON.parse(decryptText(record.payload.value))
      : record.payload,
    attempts: 0,
    maxAttempts: 1,
    baseDelayMs: DEFAULT_BASE_DELAY_MS,
    poisonThreshold: 999,
    correlationId: record.correlationId,
  };

  const replayResult = await executeWithRetry(job, handler, { maxAttempts: 1, poisonThreshold: 999 });
  if (replayResult.ok) {
    record.replayedAt = new Date();
    await record.save();
    incrementCounter('tii_dlq_replayed_total', 1, { queue: record.queueName, job: record.jobName });
  }
  return replayResult;
};

const getDlqStats = async () => {
  const [total, quarantined] = await Promise.all([
    QueueDeadLetter.countDocuments({}),
    QueueDeadLetter.countDocuments({ quarantined: true }),
  ]);
  return { total, quarantined };
};

export {
  calculateBackoffDelay,
  enqueueJob,
  executeWithRetry,
  replayDeadLetter,
  getDlqStats,
};
