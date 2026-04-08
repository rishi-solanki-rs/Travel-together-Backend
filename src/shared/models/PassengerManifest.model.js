import mongoose from 'mongoose';

const passengerManifestSchema = new mongoose.Schema({
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PackageInquiry', required: true },
  fullName: { type: String, required: true },
  age: { type: Number, min: 0, default: null },
  gender: { type: String, default: null },
  passportNumber: { type: String, default: null },
  isPrimary: { type: Boolean, default: false },
}, { timestamps: true });

passengerManifestSchema.index({ inquiryId: 1 });

export default mongoose.model('PassengerManifest', passengerManifestSchema);
