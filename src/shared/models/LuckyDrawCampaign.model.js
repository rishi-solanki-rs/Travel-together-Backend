import mongoose from 'mongoose';
import { LUCKY_DRAW_STATUS } from '../../shared/constants/index.js';

const luckyDrawCampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, lowercase: true },
    description: String,
    terms: String,
    status: { type: String, enum: Object.values(LUCKY_DRAW_STATUS), default: LUCKY_DRAW_STATUS.DRAFT },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    drawDate: { type: Date, required: true },

    prizes: [{
      rank: Number,
      title: String,
      description: String,
      value: Number,
      currency: { type: String, default: 'INR' },
      sponsoredBy: String,
    }],

    entryRules: {
      maxEntriesPerUser: { type: Number, default: 1 },
      requiresLogin: { type: Boolean, default: true },
      entryFee: { type: Number, default: 0 },
      entryActions: [{ action: String, rewardEntries: Number }],
    },

    eligibility: {
      cities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
      planTiers: [String],
      minAge: Number,
    },

    coverImage: { publicId: String, url: String, altText: String },
    bannerImage: { publicId: String, url: String, altText: String },

    stats: {
      totalEntries: { type: Number, default: 0 },
      uniqueParticipants: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
    },

    winners: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rank: Number,
      prizeTitle: String,
      notifiedAt: Date,
      claimedAt: Date,
    }],

    isDrawManual: { type: Boolean, default: false },
    drawPickedAt: Date,
    drawPickedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

luckyDrawCampaignSchema.index({ status: 1, isActive: 1 });
luckyDrawCampaignSchema.index({ startDate: 1, endDate: 1 });
luckyDrawCampaignSchema.index({ slug: 1 });

export default mongoose.model('LuckyDrawCampaign', luckyDrawCampaignSchema);
