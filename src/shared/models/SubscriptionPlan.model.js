import mongoose from 'mongoose';
import { SUBSCRIPTION_PLANS } from '../../shared/constants/index.js';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, unique: true, required: true, enum: Object.values(SUBSCRIPTION_PLANS) },
    displayName: { type: String, required: true },
    description: String,
    tagline: String,
    color: String,
    icon: String,
    priority: { type: Number, default: 0 },

    pricing: {
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      halfYearly: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },

    features: [{
      key: String,
      label: String,
      value: mongoose.Schema.Types.Mixed,
      isHighlighted: Boolean,
    }],

    limits: {
      maxListings: { type: Number, default: 1 },
      maxImages: { type: Number, default: 5 },
      maxGalleryImages: { type: Number, default: 10 },
      maxStaffAccounts: { type: Number, default: 1 },
      homepageSlotsAllowed: { type: Number, default: 0 },
      categorySlotsAllowed: { type: Number, default: 0 },
      campaignParticipation: { type: Boolean, default: false },
      analyticsAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ key: 1 });
subscriptionPlanSchema.index({ isActive: 1, priority: -1 });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
