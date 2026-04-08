import mongoose from 'mongoose';

const editorialBlockSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    subtitle: { type: String, trim: true, maxlength: 260, default: '' },
    story: { type: String, trim: true, maxlength: 6000, default: '' },
    widgetType: { type: String, trim: true, default: 'seasonal' },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null, index: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null, index: true },
    listingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' }],
    tags: [{ type: String, trim: true, lowercase: true }],
    season: { type: String, trim: true, default: 'all' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    priority: { type: Number, default: 0 },
    ctaLabel: { type: String, trim: true, maxlength: 80, default: 'Explore' },
    ctaPath: { type: String, trim: true, default: '' },
    coverImage: { publicId: String, url: String, altText: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

editorialBlockSchema.index({ cityId: 1, season: 1, isActive: 1, priority: -1 });
editorialBlockSchema.index({ widgetType: 1, isActive: 1, priority: -1 });
editorialBlockSchema.index({ tags: 1 });

export default mongoose.model('EditorialBlock', editorialBlockSchema);
