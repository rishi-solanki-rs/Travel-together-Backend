import express from 'express';
import Wishlist from '../../shared/models/Wishlist.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import { authenticate } from '../../middlewares/authenticate.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { wishlistToggleSchema, wishlistListingParamsSchema } from './wishlist.validator.js';

const router = express.Router();

const getWishlist = asyncHandler(async (req, res) => {
  const wishlists = await Wishlist.find({ userId: req.user.id })
    .populate({ path: 'listingId', select: 'title slug coverImage pricing category stats isFeatured', populate: { path: 'cityId', select: 'name' } })
    .sort({ createdAt: -1 });
  ApiResponse.success(res, 'Wishlist fetched', wishlists);
});

const toggleWishlist = asyncHandler(async (req, res) => {
  const { listingId } = req.body;
  const listing = await ListingBase.findById(listingId);
  if (!listing) throw ApiError.notFound('Listing not found');

  const existing = await Wishlist.findOne({ userId: req.user.id, listingId });
  if (existing) {
    await Wishlist.findByIdAndDelete(existing._id);
    await ListingBase.findByIdAndUpdate(listingId, { $inc: { 'stats.wishlistCount': -1 } });
    return ApiResponse.success(res, 'Removed from wishlist', { action: 'removed' });
  }

  await Wishlist.create({ userId: req.user.id, listingId, vendorId: listing.vendorId, category: listing.category });
  await ListingBase.findByIdAndUpdate(listingId, { $inc: { 'stats.wishlistCount': 1 } });
  ApiResponse.created(res, 'Added to wishlist', { action: 'added' });
});

const checkWishlist = asyncHandler(async (req, res) => {
  const exists = await Wishlist.exists({ userId: req.user.id, listingId: req.params.listingId });
  ApiResponse.success(res, 'Wishlist status', { isWishlisted: !!exists });
});

router.get('/', authenticate, getWishlist);
router.post('/toggle', authenticate, validateRequest({ body: wishlistToggleSchema }), toggleWishlist);
router.get('/check/:listingId', authenticate, validateRequest({ params: wishlistListingParamsSchema }), checkWishlist);

export default router;
