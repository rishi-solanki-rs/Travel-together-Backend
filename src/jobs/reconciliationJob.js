import logger from '../utils/logger.js';
import { withDistributedLock } from '../config/redis.js';
import { runDailyReconciliation } from '../operations/finance/reconciliation.service.js';
import { startTimer, incrementCounter } from '../operations/metrics/metrics.service.js';

const run = async () => {
  const lock = await withDistributedLock('cron:reconciliationJob:lock', async () => {
    const stop = startTimer('tii_cron_duration_ms', { job: 'reconciliationJob' });
    try {
      const result = await runDailyReconciliation();
      incrementCounter('tii_cron_success_total', 1, { job: 'reconciliationJob' });
      logger.info({ runId: result.run?._id }, 'reconciliationJob completed');
      return result;
    } catch (error) {
      incrementCounter('tii_cron_failure_total', 1, { job: 'reconciliationJob' });
      throw error;
    } finally {
      stop();
    }
  }, {
    ttlSeconds: 600,
    onLocked: () => logger.warn('reconciliationJob skipped due to active lock'),
  });

  if (!lock.executed) {
    return { executed: false, locked: true };
  }

  return lock.value;
};

export { run };
