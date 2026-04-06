import mongoose from 'mongoose';
import { SLOT_TYPES, SLOT_STATUS, SUBSCRIPTION_PLANS } from '../../shared/constants/index.js';

const slotInventorySchema = new mongoose.Schema(
  {
    slotType: { type: String, enum: Object.values(SLOT_TYPES), required: true },
    planTier: { type: String, enum: Object.values(SUBSCRIPTION_PLANS), required: true },

    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType', default: null },

    totalSlots: { type: Number, required: true, min: 0 },
    assignedSlots: { type: Number, default: 0 },
    availableSlots: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

slotInventorySchema.index({ slotType: 1, planTier: 1 });
slotInventorySchema.index({ cityId: 1, slotType: 1 });
slotInventorySchema.index({ categoryId: 1, slotType: 1 });

export default mongoose.model('SlotInventory', slotInventorySchema);
