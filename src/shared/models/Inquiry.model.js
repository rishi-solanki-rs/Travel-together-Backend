import mongoose from 'mongoose';
import { INQUIRY_STATUS } from '../../shared/constants/index.js';

const inquirySchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true, maxlength: 2000 },

    status: { type: String, enum: Object.values(INQUIRY_STATUS), default: INQUIRY_STATUS.NEW },

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
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Inquiry', inquirySchema);
