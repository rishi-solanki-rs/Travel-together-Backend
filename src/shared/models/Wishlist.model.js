import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    category: String,
    note: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, listingId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1, createdAt: -1 });
wishlistSchema.index({ listingId: 1 });

export default mongoose.model('Wishlist', wishlistSchema);
