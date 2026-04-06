import mongoose from 'mongoose';
import { KYC_STATUS } from '../../shared/constants/index.js';

const documentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  number: { type: String },
  url: { type: String },
  publicId: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  rejectionReason: String,
  status: { type: String, enum: Object.values(KYC_STATUS), default: KYC_STATUS.PENDING },
}, { _id: true });

const vendorKYCSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    status: { type: String, enum: Object.values(KYC_STATUS), default: KYC_STATUS.PENDING },
    submittedAt: Date,
    verifiedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,

    businessType: {
      type: String,
      enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'ngo', 'individual', 'other'],
      required: true,
    },

    legalBusinessName: { type: String, required: true },
    tradeName: String,
    panNumber: { type: String, uppercase: true },
    gstNumber: { type: String, uppercase: true },
    cinNumber: String,

    documents: {
      pan: documentSchema,
      gst: documentSchema,
      tradeLicense: documentSchema,
      incorporation: documentSchema,
      addressProof: documentSchema,
      ownerIdProof: documentSchema,
      bankStatement: documentSchema,
    },

    bankDetails: {
      accountHolderName: String,
      accountNumber: { type: String, select: false },
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountType: { type: String, enum: ['savings', 'current', 'overdraft'] },
    },

    registeredAddress: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: String,
    reviewHistory: [{
      status: String,
      notes: String,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date, default: Date.now },
    }],

    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vendorKYCSchema.index({ vendorId: 1 });
vendorKYCSchema.index({ status: 1 });
vendorKYCSchema.index({ submittedAt: -1 });

export default mongoose.model('VendorKYC', vendorKYCSchema);
