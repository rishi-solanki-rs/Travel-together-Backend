import mongoose from 'mongoose';

const childProfileSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, default: null },
  allergies: [String],
  medicalNotes: { type: String, default: null },
}, { timestamps: true });

childProfileSchema.index({ ownerUserId: 1, fullName: 1 });

export default mongoose.model('ChildProfile', childProfileSchema);
