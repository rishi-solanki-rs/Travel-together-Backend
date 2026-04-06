import mongoose from 'mongoose';
import { MEDIA_TYPES, MEDIA_ROLES } from '../../shared/constants/index.js';

const mediaAssetSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    publicId: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: Object.values(MEDIA_TYPES), default: MEDIA_TYPES.IMAGE },
    role: { type: String, enum: Object.values(MEDIA_ROLES), default: MEDIA_ROLES.GALLERY },
    format: String,
    width: Number,
    height: Number,
    bytes: Number,
    altText: String,
    caption: String,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    variants: {
      desktop: String,
      mobile: String,
      card: String,
      thumbnail: String,
      seo: String,
      webp: String,
    },

    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ vendorId: 1 });
mediaAssetSchema.index({ listingId: 1, role: 1, order: 1 });
mediaAssetSchema.index({ publicId: 1 });
mediaAssetSchema.index({ isDeleted: 1 });

export default mongoose.model('MediaAsset', mediaAssetSchema);
