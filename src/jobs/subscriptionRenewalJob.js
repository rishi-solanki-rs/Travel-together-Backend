import VendorSubscription from '../shared/models/VendorSubscription.model.js';
import Notification from '../shared/models/Notification.model.js';
import Vendor from '../shared/models/Vendor.model.js';
import SlotAssignment from '../shared/models/SlotAssignment.model.js';
import ListingBase from '../shared/models/ListingBase.model.js';
import { sendEmail, emailTemplates } from '../utils/emailHelper.js';
import User from '../shared/models/User.model.js';
import logger from '../utils/logger.js';
import { SUBSCRIPTION_STATUS, NOTIFICATION_TYPES } from '../shared/constants/index.js';
import withTransaction from '../shared/utils/withTransaction.js';
import { SLOT_STATUS } from '../shared/constants/index.js';
import { withDistributedLock } from '../config/redis.js';
import { detectSubscriptionSlotMismatches, reconcileOrphanAssignments } from '../modules/slots/slots.service.js';
import { enqueueJob } from '../operations/queue/queue.service.js';
import { recordAuditEvent } from '../operations/audit/audit.service.js';

const run = async () => {
  const lockKey = 'cron:subscriptionRenewalJob:lock';
  const lock = await withDistributedLock(lockKey, async () => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const preRunMismatches = await detectSubscriptionSlotMismatches({});
    logger.warn({ count: preRunMismatches.length }, 'subscriptionRenewalJob pre-run subscription-slot mismatches');

    const expiringSoon = await VendorSubscription.find({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $gte: now, $lte: sevenDaysLater },
      reminderSentAt: null,
    }).populate('vendorId');

    logger.info(`subscriptionRenewalJob: Found ${expiringSoon.length} subscriptions expiring within 7 days`);

    for (const sub of expiringSoon) {
      try {
        const vendor = sub.vendorId;
        const owner = await User.findById(vendor.ownerId).select('email name');

        const expiryDate = sub.endDate.toDateString();
        const { subject, html } = emailTemplates.slotExpiry(vendor.businessName, `${sub.planKey} subscription`, expiryDate);

        if (owner?.email) {
          await sendEmail({ to: owner.email, subject, html }).catch(() => {});
          await enqueueJob('emails', 'subscription-renewal-reminder', {
            email: owner.email,
            vendorId: String(vendor._id),
            subscriptionId: String(sub._id),
          }, { correlationId: `subscription-reminder-${sub._id}` });
        }

        await Notification.create({
          userId: owner._id,
          type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
          title: 'Subscription Expiring Soon',
          message: `Your ${sub.planKey} plan expires on ${expiryDate}. Renew now to maintain premium benefits.`,
          link: '/vendor/plans',
        });
        await enqueueJob('notifications', 'subscription-expiring', {
          userId: String(owner._id),
          subscriptionId: String(sub._id),
          vendorId: String(vendor._id),
        }, { correlationId: `subscription-reminder-${sub._id}` });

        sub.reminderSentAt = now;
        await sub.save();
      } catch (err) {
        logger.error({ err, subscriptionId: sub._id }, 'Failed to send renewal reminder');
      }
    }

    const expired = await VendorSubscription.find({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $lte: now },
    });

    let expiredCount = 0;
    let failedExpiries = 0;

    for (const sub of expired) {
      try {
        await withTransaction(async ({ session }) => {
          sub.status = SUBSCRIPTION_STATUS.EXPIRED;
          await sub.save({ session });

          await Vendor.findByIdAndUpdate(sub.vendorId, { currentPlan: 'free', activeSubscriptionId: null }, { session });

          const premiumAssignments = await SlotAssignment.find({ subscriptionId: sub._id, status: SLOT_STATUS.ASSIGNED }).session(session);
          for (const assignment of premiumAssignments) {
            assignment.status = SLOT_STATUS.EXPIRED;
            assignment.expiredAt = new Date();
            await assignment.save({ session });
            if (assignment.listingId) {
              await ListingBase.findByIdAndUpdate(assignment.listingId, { isFeatured: false, isPremium: false, planPriority: 0 }, { session });
            }
          }
        }, {
          correlationId: `subscription-expiry-${sub._id}`,
          maxAttempts: 2,
          retryHook: async ({ error }) => String(error?.message || '').toLowerCase().includes('writeconflict'),
        });
        await recordAuditEvent({
          eventType: 'subscriptions.expired.cron',
          module: 'subscriptions',
          entityType: 'VendorSubscription',
          entityId: sub._id,
          action: 'expire-subscription-cron',
          context: { source: 'cron', correlationId: `subscription-expiry-${sub._id}` },
          afterSnapshot: { status: SUBSCRIPTION_STATUS.EXPIRED },
        });
        expiredCount += 1;
      } catch (error) {
        failedExpiries += 1;
        logger.error({ err: error, subscriptionId: sub._id }, 'Failed to expire subscription');
      }
    }

    const reconciliation = await reconcileOrphanAssignments({ correlationId: 'subscription-renewal-reconcile' });
    logger.warn({
      preRunMismatchCount: preRunMismatches.length,
      postReconcileMismatchCount: reconciliation.mismatches.length,
      reconciledCount: reconciliation.reconciled,
    }, 'subscriptionRenewalJob mismatch reconciliation summary');

    logger.info(`subscriptionRenewalJob: Marked ${expiredCount} subscriptions as expired, failed ${failedExpiries}`);
    return { expiredCount, failedExpiries, reconciled: reconciliation.reconciled };
  }, {
    ttlSeconds: 240,
    onLocked: () => logger.warn('subscriptionRenewalJob skipped due to active lock'),
  });

  if (!lock.executed) {
    logger.info('subscriptionRenewalJob: lock not acquired, exiting safely');
  }
};

export { run };
