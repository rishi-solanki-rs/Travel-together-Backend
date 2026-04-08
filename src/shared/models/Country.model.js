import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
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

countrySchema.index({ slug: 1 }, { unique: true });
countrySchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model('Country', countrySchema);
