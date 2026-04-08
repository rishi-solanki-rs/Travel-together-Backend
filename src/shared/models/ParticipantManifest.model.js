import mongoose from 'mongoose';

const participantManifestSchema = new mongoose.Schema({
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', required: true },
  fullName: { type: String, required: true },
  age: { type: Number, min: 0, default: null },
  gender: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  specialNeeds: { type: String, default: null },
}, { timestamps: true });

participantManifestSchema.index({ reservationId: 1, fullName: 1 });

export default mongoose.model('ParticipantManifest', participantManifestSchema);
