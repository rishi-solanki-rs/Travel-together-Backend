import mongoose from 'mongoose';

const waitlistEntrySchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  childProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true },
  guardianProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuardianProfile', required: true },
  priority: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'promoted', 'cancelled'], default: 'active' },
}, { timestamps: true });

waitlistEntrySchema.index({ listingId: 1, sessionId: 1, status: 1, createdAt: 1 });

export default mongoose.model('WaitlistEntry', waitlistEntrySchema);
