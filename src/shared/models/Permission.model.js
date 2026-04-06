import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    resource: { type: String, required: true },
    action: { type: String, required: true, enum: ['create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 'export'] },
    description: String,
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ name: 1 });

export default mongoose.model('Permission', permissionSchema);
