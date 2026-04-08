import logger from '../utils/logger.js';
import { withDistributedLock } from '../config/redis.js';
import { detectSubscriptionSlotMismatches, reconcileOrphanAssignments } from '../modules/slots/slots.service.js';

const run = async () => {
  const lockKey = 'cron:subscriptionSlotReconciliationJob:lock';
  const lock = await withDistributedLock(lockKey, async () => {
    const mismatches = await detectSubscriptionSlotMismatches({});
    if (!mismatches.length) {
      logger.info('subscriptionSlotReconciliationJob: no mismatches found');
      return { mismatches: 0, reconciled: 0 };
    }

    logger.warn({ mismatchCount: mismatches.length }, 'subscriptionSlotReconciliationJob: mismatches detected');
    const reconciliation = await reconcileOrphanAssignments({ correlationId: 'subscription-slot-reconciliation-job' });

    logger.warn({
      mismatchCount: mismatches.length,
      reconciledCount: reconciliation.reconciled,
      remainingCount: Math.max(reconciliation.mismatches.length - reconciliation.reconciled, 0),
    }, 'subscriptionSlotReconciliationJob: reconciliation completed');

    return { mismatches: mismatches.length, reconciled: reconciliation.reconciled };
  }, {
    ttlSeconds: 180,
    onLocked: () => logger.warn('subscriptionSlotReconciliationJob skipped due to active lock'),
  });

  if (!lock.executed) {
    logger.info('subscriptionSlotReconciliationJob: lock not acquired, exiting safely');
  }
};

export { run };
