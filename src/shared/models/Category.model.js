import mongoose from 'mongoose';
import { CATEGORIES } from '../../shared/constants/index.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, required: true },
    key: { type: String, unique: true, enum: Object.values(CATEGORIES), required: true },
    description: String,
    shortDescription: String,
    icon: String,
    image: { publicId: String, url: String, altText: String },
    coverImage: { publicId: String, url: String, altText: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    color: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    seoConfig: { metaTitle: String, metaDescription: String, keywords: [String] },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 });
categorySchema.index({ key: 1 });
categorySchema.index({ isActive: 1, order: 1 });

export default mongoose.model('Category', categorySchema);
