import mongoose from 'mongoose';

const fieldDefinitionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'decimal', 'boolean', 'date', 'datetime', 'time', 'select', 'multiselect', 'array', 'object', 'image', 'images', 'file', 'url', 'email', 'phone', 'price', 'duration', 'location'],
  },
  options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
  isRequired: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: true },
  isSearchable: { type: Boolean, default: false },
  isFiltrable: { type: Boolean, default: false },
  placeholder: String,
  helpText: String,
  defaultValue: mongoose.Schema.Types.Mixed,
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    allowedExtensions: [String],
    maxFileSize: Number,
  },
  group: String,
  order: { type: Number, default: 0 },
  dependsOn: { field: String, value: mongoose.Schema.Types.Mixed },
}, { _id: false });

const listingTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, unique: true, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType' },
    description: String,
    version: { type: Number, default: 1 },
    fields: [fieldDefinitionSchema],
    priceRules: {
      priceType: { type: String, enum: ['fixed', 'per_person', 'per_night', 'per_hour', 'free', 'contact_for_price', 'range'] },
      currency: { type: String, default: 'INR' },
      allowDiscount: { type: Boolean, default: true },
      allowSeasonalPricing: { type: Boolean, default: false },
    },
    mediaRules: {
      minImages: { type: Number, default: 1 },
      maxImages: { type: Number, default: 20 },
      requiredVariants: [{ type: String, enum: ['cover', 'gallery', 'thumbnail', 'banner', 'room', 'menu', 'product'] }],
    },
    cardRules: {
      titleField: String,
      subtitleField: String,
      priceField: String,
      badgeField: String,
      locationField: String,
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

listingTemplateSchema.index({ categoryId: 1, subtypeId: 1 });
listingTemplateSchema.index({ key: 1 });

export default mongoose.model('ListingTemplate', listingTemplateSchema);
