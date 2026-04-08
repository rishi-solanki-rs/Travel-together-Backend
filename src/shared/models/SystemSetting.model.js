import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    category: { type: String, default: 'general' },
    description: { type: String, default: null },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    isEnabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

systemSettingSchema.index({ key: 1 }, { unique: true });
systemSettingSchema.index({ category: 1, key: 1 });

export default mongoose.model('SystemSetting', systemSettingSchema);
