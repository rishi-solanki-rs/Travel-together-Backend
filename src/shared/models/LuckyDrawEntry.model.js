import mongoose from 'mongoose';

const luckyDrawEntrySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entryNumber: { type: String, unique: true },
    entryCount: { type: Number, default: 1 },
    entrySource: { type: String, enum: ['direct', 'referral', 'social_share', 'review', 'wishlist'], default: 'direct' },
    ipAddress: String,
    userAgent: String,
    isWinner: { type: Boolean, default: false },
    winnerRank: Number,
    isDisqualified: { type: Boolean, default: false },
    disqualificationReason: String,
  },
  { timestamps: true }
);

luckyDrawEntrySchema.index({ campaignId: 1, userId: 1 }, { unique: true });
luckyDrawEntrySchema.index({ campaignId: 1, isWinner: 1 });
luckyDrawEntrySchema.index({ entryNumber: 1 });

export default mongoose.model('LuckyDrawEntry', luckyDrawEntrySchema);
