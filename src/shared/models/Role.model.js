import mongoose from 'mongoose';
import { USER_ROLES } from '../../shared/constants/index.js';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true, enum: Object.values(USER_ROLES) },
    displayName: { type: String, required: true },
    description: String,
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Role', roleSchema);
