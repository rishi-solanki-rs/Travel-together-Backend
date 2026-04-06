import mongoose from 'mongoose';
import { ANALYTICS_EVENT_TYPES } from '../../shared/constants/index.js';

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: Object.values(ANALYTICS_EVENT_TYPES), required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: String,
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType', default: null },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotAssignment', default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', default: null },

    ipAddress: String,
    userAgent: String,
    referer: String,
    device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },

    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmContent: String,

    searchQuery: String,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    timeseries: false,
  }
);

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ vendorId: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ listingId: 1, eventType: 1 });
analyticsEventSchema.index({ cityId: 1, eventType: 1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ userId: 1, eventType: 1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
