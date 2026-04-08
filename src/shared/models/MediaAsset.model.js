import mongoose from 'mongoose';
import { MEDIA_TYPES, MEDIA_ROLES } from '../../shared/constants/index.js';

const mediaAssetSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    publicId: { type: String, required: true, unique: true },
    checksum: { type: String, default: null },
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
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isOrphaned: { type: Boolean, default: false },
    lastAccessedAt: { type: Date, default: null },
    orphanCandidate: { type: Boolean, default: false },
    cleanupEligibleAt: { type: Date, default: null },
    deleteRetryCount: { type: Number, default: 0 },
    lifecycleStatus: {
      type: String,
      enum: ['active', 'orphaned', 'pending_delete', 'delete_failed', 'deleted', 'duplicate'],
      default: 'active',
    },
    cleanupRequestedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },

    variants: {
      desktop: String,
      mobile: String,
      card: String,
      thumbnail: String,
      seo: String,
      webp: String,
    },

    replacementHistory: [{
      previousPublicId: { type: String, default: null },
      previousUrl: { type: String, default: null },
      replacedAt: { type: Date, default: Date.now },
      replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    }],

    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ vendorId: 1 });
mediaAssetSchema.index({ listingId: 1, role: 1, order: 1 });
mediaAssetSchema.index({ isDeleted: 1 });
mediaAssetSchema.index({ checksum: 1, vendorId: 1, isDeleted: 1 }, { partialFilterExpression: { checksum: { $exists: true, $ne: null } } });
mediaAssetSchema.index({ lifecycleStatus: 1, cleanupEligibleAt: 1, deleteRetryCount: 1 });
mediaAssetSchema.index({ orphanCandidate: 1, isDeleted: 1, cleanupEligibleAt: 1 });
mediaAssetSchema.index({ isOrphaned: 1, isDeleted: 1 });

export default mongoose.model('MediaAsset', mediaAssetSchema);
