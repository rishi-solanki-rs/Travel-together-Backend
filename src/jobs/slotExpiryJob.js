import SlotAssignment from '../shared/models/SlotAssignment.model.js';
import ListingBase from '../shared/models/ListingBase.model.js';
import Notification from '../shared/models/Notification.model.js';
import logger from '../utils/logger.js';
import { SLOT_STATUS, NOTIFICATION_TYPES } from '../shared/constants/index.js';
import SlotInventory from '../shared/models/SlotInventory.model.js';

const run = async () => {
  const now = new Date();
  const expiredAssignments = await SlotAssignment.find({
    status: SLOT_STATUS.ASSIGNED,
    endDate: { $lte: now },
  });

  logger.info(`slotExpiryJob: Found ${expiredAssignments.length} expired slot assignments`);


  for (const assignment of expiredAssignments) {
    assignment.status = SLOT_STATUS.EXPIRED;
    assignment.expiredAt = now;
    await assignment.save();

    await SlotInventory.findByIdAndUpdate(assignment.inventoryId, {
      $inc: { assignedSlots: -1, availableSlots: 1 },
    });

    if (assignment.listingId) {
      await ListingBase.findByIdAndUpdate(assignment.listingId, {
        isFeatured: false,
        isPremium: false,
        planPriority: 0,
      });
    }

    await Notification.create({
      userId: assignment.vendorId,
      type: NOTIFICATION_TYPES.SLOT_EXPIRED,
      title: 'Premium Slot Expired',
      message: `Your ${assignment.slotType} premium slot has expired. Renew your plan to regain visibility.`,
      link: '/vendor/plans',
    });
  }

  logger.info(`slotExpiryJob: Processed ${expiredAssignments.length} expirations`);
};

export { run };
