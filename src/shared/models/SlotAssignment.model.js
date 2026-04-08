import mongoose from 'mongoose';
import { SLOT_TYPES, SLOT_STATUS } from '../../shared/constants/index.js';

const slotAssignmentSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorSubscription', required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotInventory', required: true },

    slotType: { type: String, enum: Object.values(SLOT_TYPES), required: true },
    status: { type: String, enum: Object.values(SLOT_STATUS), default: SLOT_STATUS.ASSIGNED },

    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType', default: null },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    expiredAt: Date,

    priority: { type: Number, default: 0 },
    campaignBoost: { type: Boolean, default: false },
    campaignBoostExpiry: Date,

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

slotAssignmentSchema.index({ vendorId: 1, status: 1 });
slotAssignmentSchema.index({ listingId: 1, slotType: 1 });
slotAssignmentSchema.index({ slotType: 1, cityId: 1, status: 1 });
slotAssignmentSchema.index({ endDate: 1, status: 1 });
slotAssignmentSchema.index({ priority: -1 });
slotAssignmentSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true });

export default mongoose.model('SlotAssignment', slotAssignmentSchema);
