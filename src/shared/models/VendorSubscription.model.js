import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_PLANS } from '../../shared/constants/index.js';

const vendorSubscriptionSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planKey: { type: String, enum: Object.values(SUBSCRIPTION_PLANS), required: true },

    status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.PENDING_PAYMENT },

    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'halfYearly', 'annual'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    startDate: Date,
    endDate: Date,
    trialEndDate: Date,
    nextBillingDate: Date,

    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    paymentReference: String,
    paymentGateway: String,
    paymentDetails: { type: Map, of: mongoose.Schema.Types.Mixed },

    renewalCount: { type: Number, default: 0 },
    cancelledAt: Date,
    cancellationReason: String,
    gracePeriodEndsAt: Date,
    gracePeriodUntil: Date,
    replacedBySubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorSubscription', default: null },

    features: [{
      key: String,
      label: String,
      value: mongoose.Schema.Types.Mixed,
    }],

    limits: {
      maxListings: Number,
      maxImages: Number,
      homepageSlotsAllowed: Number,
      categorySlotsAllowed: Number,
    },

    autoRenew: { type: Boolean, default: true },
    reminderSentAt: Date,
    renewalHistory: [{
      validFrom: { type: Date, default: null },
      validTo: { type: Date, default: null },
      amount: { type: Number, default: 0 },
      renewedAt: { type: Date, default: Date.now },
      renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      notes: { type: String, default: null },
    }],
    planChangeHistory: [{
      fromPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
      toPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      notes: { type: String, default: null },
    }],

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

vendorSubscriptionSchema.index({ vendorId: 1, status: 1 });
vendorSubscriptionSchema.index({ vendorId: 1, status: 1, endDate: 1 });
vendorSubscriptionSchema.index({ endDate: 1, status: 1 });
vendorSubscriptionSchema.index({ planKey: 1 });
vendorSubscriptionSchema.index({ paymentStatus: 1 });

export default mongoose.model('VendorSubscription', vendorSubscriptionSchema);
