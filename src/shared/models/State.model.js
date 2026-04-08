import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'unpublished'],
      default: 'draft',
    },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stateSchema.index({ countryId: 1, name: 1, isDeleted: 1 });
stateSchema.index({ countryId: 1, slug: 1 }, { unique: true });
stateSchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model('State', stateSchema);
