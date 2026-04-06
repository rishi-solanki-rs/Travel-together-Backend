import mongoose from 'mongoose';

const subtypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, required: true },
    key: { type: String, unique: true, required: true },
    description: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    icon: String,
    image: { publicId: String, url: String, altText: String },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingTemplate' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    color: String,
    searchFilters: [{
      field: String,
      label: String,
      type: { type: String, enum: ['text', 'number', 'range', 'select', 'multiselect', 'boolean', 'date'] },
      options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
      isRequired: Boolean,
    }],
    cardConfig: {
      primaryField: String,
      secondaryField: String,
      badgeField: String,
      priceField: String,
    },
    seoConfig: { metaTitle: String, metaDescription: String, keywords: [String] },
  },
  { timestamps: true }
);

subtypeSchema.index({ categoryId: 1, isActive: 1 });
subtypeSchema.index({ slug: 1 });
subtypeSchema.index({ key: 1 });

export default mongoose.model('SubType', subtypeSchema);
