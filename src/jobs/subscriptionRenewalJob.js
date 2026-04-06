import VendorSubscription from '../shared/models/VendorSubscription.model.js';
import Notification from '../shared/models/Notification.model.js';
import Vendor from '../shared/models/Vendor.model.js';
import { sendEmail, emailTemplates } from '../utils/emailHelper.js';
import User from '../shared/models/User.model.js';
import logger from '../utils/logger.js';
import { SUBSCRIPTION_STATUS, NOTIFICATION_TYPES } from '../shared/constants/index.js';

const run = async () => {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      }

      await Notification.create({
        userId: owner._id,
        type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
        title: 'Subscription Expiring Soon',
        message: `Your ${sub.planKey} plan expires on ${expiryDate}. Renew now to maintain premium benefits.`,
        link: '/vendor/plans',
      });

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

  for (const sub of expired) {
    sub.status = SUBSCRIPTION_STATUS.EXPIRED;
    await sub.save();

    await Vendor.findByIdAndUpdate(sub.vendorId, { currentPlan: 'free', activeSubscriptionId: null });
  }

  logger.info(`subscriptionRenewalJob: Marked ${expired.length} subscriptions as expired`);
};

export { run };
