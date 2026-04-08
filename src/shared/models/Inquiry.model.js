import mongoose from 'mongoose';
import { INQUIRY_STATUS } from '../../shared/constants/index.js';

const inquirySchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },
    domain: { type: String, trim: true, default: '' },

    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true, maxlength: 2000 },

    status: { type: String, enum: Object.values(INQUIRY_STATUS), default: INQUIRY_STATUS.NEW },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedVendorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nextFollowupAt: { type: Date, default: null },
    followupNotes: [
      {
        note: { type: String, trim: true, maxlength: 1500, required: true },
        byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        byRole: { type: String, default: '' },
        at: { type: Date, default: Date.now },
        nextFollowupAt: { type: Date, default: null },
        statusAtTime: { type: String, enum: Object.values(INQUIRY_STATUS), default: INQUIRY_STATUS.NEW },
      },
    ],
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    preferredVisitTime: { type: String, trim: true, default: '' },
    sourceWidget: { type: String, trim: true, default: '' },
    sourcePage: { type: String, trim: true, default: '' },
    conversionValue: { type: Number, default: 0, min: 0 },
    lostReason: { type: String, trim: true, maxlength: 500, default: '' },
    seasonalInterest: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],

    category: String,
    referenceSource: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,

    preferredDate: Date,
    preferredTime: String,
    groupSize: Number,
    budget: String,

    vendorResponse: { type: String, maxlength: 2000 },
    respondedAt: Date,
    convertedAt: Date,
    closedAt: Date,

    isSpam: { type: Boolean, default: false },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

inquirySchema.index({ vendorId: 1, status: 1 });
inquirySchema.index({ listingId: 1 });
inquirySchema.index({ userId: 1 });
inquirySchema.index({ assignedTo: 1, nextFollowupAt: 1 });
inquirySchema.index({ assignedVendorUser: 1, nextFollowupAt: 1 });
inquirySchema.index({ cityId: 1, areaId: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Inquiry', inquirySchema);
