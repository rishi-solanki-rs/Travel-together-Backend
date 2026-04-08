import mongoose from 'mongoose';

const packageInquirySchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationPackage', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  inquirerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  inquiryRef: { type: String, required: true, unique: true },
  status: { type: String, enum: ['new', 'quoted', 'booked', 'cancelled'], default: 'new' },
  departureDate: { type: Date, default: null },
  travelersCount: { type: Number, default: 1 },
  notes: { type: String, default: null },
}, { timestamps: true });

packageInquirySchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export default mongoose.model('PackageInquiry', packageInquirySchema);
