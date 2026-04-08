import mongoose from 'mongoose';
import logger from '../../utils/logger.js';
import { getCorrelationId } from '../context/requestContext.js';
import { incrementCounter, startTimer } from '../../operations/metrics/metrics.service.js';

const RUNNING_TRANSACTION = Symbol('runningTransaction');
const DEFAULT_MAX_ATTEMPTS = 1;

const buildTransactionError = (error, context) => {
  if (!error || typeof error !== 'object') return error;
  error.transaction = {
    ...(error.transaction || {}),
    correlationId: context.correlationId || null,
    attempts: context.attempt,
    maxAttempts: context.maxAttempts,
  };
  return error;
};

const withTransaction = async (handler, options = {}) => {
  const existingContext = options.context || null;
  if (existingContext?.session && existingContext[RUNNING_TRANSACTION]) {
    return handler(existingContext);
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 30000;
  const correlationId = options.correlationId || existingContext?.correlationId || getCorrelationId() || null;
  const maxAttempts = Math.max(1, Number.isFinite(options.maxAttempts) ? Math.floor(options.maxAttempts) : DEFAULT_MAX_ATTEMPTS);
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    const session = await mongoose.startSession();
    const context = {
      ...existingContext,
      session,
      correlationId,
      attempt,
      maxAttempts,
      [RUNNING_TRANSACTION]: true,
    };

    if (options.onStart) options.onStart({ correlationId, attempt, maxAttempts });
    session.startTransaction();
    let timeout = null;
    try {
      const stop = startTimer('tii_transaction_duration_ms', { attempt });
      timeout = timeoutMs > 0
        ? setTimeout(() => {
            logger.warn({ correlationId, timeoutMs, attempt }, 'withTransaction timeout guard reached');
          }, timeoutMs)
        : null;

      const result = await handler(context);
      await session.commitTransaction();
      stop();
      incrementCounter('tii_transaction_commits_total', 1, { attempt });
      if (timeout) clearTimeout(timeout);
      if (options.onCommit) options.onCommit({ correlationId, attempt, maxAttempts });
      session.endSession();
      return result;
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      lastError = buildTransactionError(error, context);
      try {
        await session.abortTransaction();
      } catch (abortError) {
        logger.warn({ abortError, correlationId, attempt }, 'withTransaction abort failed');
      } finally {
        session.endSession();
      }

      if (options.onRollback) options.onRollback({ correlationId, error: lastError, attempt, maxAttempts });
      incrementCounter('tii_transaction_rollbacks_total', 1, { attempt });
      const canRetry = attempt < maxAttempts && typeof options.retryHook === 'function'
        ? await options.retryHook({ error: lastError, attempt, maxAttempts, correlationId })
        : false;
      if (!canRetry) {
        throw lastError;
      }
    }
  }

  throw lastError;
};

export default withTransaction;