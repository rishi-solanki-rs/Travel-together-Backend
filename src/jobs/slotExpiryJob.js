import SlotAssignment from '../shared/models/SlotAssignment.model.js';
import ListingBase from '../shared/models/ListingBase.model.js';
import Notification from '../shared/models/Notification.model.js';
import logger from '../utils/logger.js';
import { SLOT_STATUS, NOTIFICATION_TYPES } from '../shared/constants/index.js';
import SlotInventory from '../shared/models/SlotInventory.model.js';
import withTransaction from '../shared/utils/withTransaction.js';
import { withDistributedLock } from '../config/redis.js';
import { enqueueJob } from '../operations/queue/queue.service.js';
import { recordAuditEvent } from '../operations/audit/audit.service.js';

const run = async () => {
  const lockKey = 'cron:slotExpiryJob:lock';
  const lock = await withDistributedLock(lockKey, async () => {
    const now = new Date();
    const expiredAssignments = await SlotAssignment.find({
      status: SLOT_STATUS.ASSIGNED,
      endDate: { $lte: now },
    });

    logger.info(`slotExpiryJob: Found ${expiredAssignments.length} expired slot assignments`);

    let processed = 0;
    let failed = 0;

    for (const assignment of expiredAssignments) {
      try {
        await withTransaction(async ({ session }) => {
          assignment.status = SLOT_STATUS.EXPIRED;
          assignment.expiredAt = now;
          await assignment.save({ session });

          await SlotInventory.findOneAndUpdate({ _id: assignment.inventoryId, assignedSlots: { $gt: 0 } }, {
            $inc: { assignedSlots: -1, availableSlots: 1 },
          }, { session });

          if (assignment.listingId) {
            await ListingBase.findByIdAndUpdate(assignment.listingId, {
              isFeatured: false,
              isPremium: false,
              planPriority: 0,
            }, { session });
          }

          await Notification.create([{
            userId: assignment.vendorId,
            type: NOTIFICATION_TYPES.SLOT_EXPIRED,
            title: 'Premium Slot Expired',
            message: `Your ${assignment.slotType} premium slot has expired. Renew your plan to regain visibility.`,
            link: '/vendor/plans',
          }], { session });

          await enqueueJob('notifications', 'slot-expired', {
            vendorId: String(assignment.vendorId),
            assignmentId: String(assignment._id),
            slotType: assignment.slotType,
          }, { correlationId: `slot-expiry-${assignment._id}` });
        }, {
          correlationId: `slot-expiry-${assignment._id}`,
          maxAttempts: 2,
          retryHook: async ({ error }) => String(error?.message || '').toLowerCase().includes('writeconflict'),
        });
        await recordAuditEvent({
          eventType: 'slots.assignment.expired.cron',
          module: 'slots',
          entityType: 'SlotAssignment',
          entityId: assignment._id,
          action: 'cron-expire-assignment',
          context: { source: 'cron', correlationId: `slot-expiry-${assignment._id}` },
          afterSnapshot: { status: SLOT_STATUS.EXPIRED },
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        logger.error({ err: error, assignmentId: assignment._id }, 'slotExpiryJob failed for assignment');
      }
    }

    logger.info(`slotExpiryJob: Processed ${processed} expirations, failed ${failed}`);
    return { processed, failed };
  }, {
    ttlSeconds: 180,
    onLocked: () => logger.warn('slotExpiryJob skipped due to active lock'),
  });

  if (!lock.executed) {
    logger.info('slotExpiryJob: lock not acquired, exiting safely');
  }
};

export { run };
