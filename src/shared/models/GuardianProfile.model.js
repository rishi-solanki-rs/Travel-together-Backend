import mongoose from 'mongoose';

const guardianProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: null },
  relationToChild: { type: String, default: 'parent' },
  emergencyContact: {
    name: { type: String, default: null },
    phone: { type: String, default: null },
  },
}, { timestamps: true });

guardianProfileSchema.index({ userId: 1 });

export default mongoose.model('GuardianProfile', guardianProfileSchema);
