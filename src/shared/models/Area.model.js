import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema(
  {
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    zoneType: {
      type: String,
      enum: ['tourist_zone', 'market_zone', 'food_zone', 'residential_zone', 'mixed'],
      default: 'mixed',
    },
    nearbyLandmarks: [{ type: String, trim: true }],
    popularRoutes: [{ type: String, trim: true }],
    clusterKey: { type: String, trim: true, default: '' },
    geoLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    seoConfig: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

areaSchema.index({ cityId: 1, slug: 1 }, { unique: true });
areaSchema.index({ cityId: 1, isActive: 1, order: 1 });
areaSchema.index({ geoLocation: '2dsphere' });

export default mongoose.model('Area', areaSchema);
