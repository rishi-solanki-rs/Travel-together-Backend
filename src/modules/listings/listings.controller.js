import listingsService from './listings.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createListing = asyncHandler(async (req, res) => {
  const listing = await listingsService.createListing(req.user.vendorId, req.body);
  ApiResponse.created(res, 'Listing created as draft', listing);
});

const getMyListings = asyncHandler(async (req, res) => {
  const { listings, pagination } = await listingsService.getVendorListings(req.user.vendorId, req.query);
  ApiResponse.paginated(res, 'Your listings fetched', listings, pagination);
});

const getListingBySlug = asyncHandler(async (req, res) => {
  const listing = await listingsService.getListingBySlug(req.params.slug);
  ApiResponse.success(res, 'Listing fetched', listing);
});

const updateListing = asyncHandler(async (req, res) => {
  const listing = await listingsService.updateListing(req.params.id, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Listing updated', listing);
});

const submitForReview = asyncHandler(async (req, res) => {
  const listing = await listingsService.submitForReview(req.params.id, req.user.vendorId);
  ApiResponse.success(res, 'Listing submitted for review', listing);
});

const deleteListing = asyncHandler(async (req, res) => {
  await listingsService.softDeleteListing(req.params.id, req.user.vendorId);
  ApiResponse.noContent(res);
});

const getAllListings = asyncHandler(async (req, res) => {
  const { listings, pagination } = await listingsService.getAllListings(req.query);
  ApiResponse.paginated(res, 'Listings fetched', listings, pagination);
});

const publishListing = asyncHandler(async (req, res) => {
  const listing = await listingsService.publishListing(req.params.id, req.user.id);
  ApiResponse.success(res, 'Listing published', listing);
});

const unpublishListing = asyncHandler(async (req, res) => {
  const listing = await listingsService.unpublishListing(req.params.id, req.user.id, req.body.notes);
  ApiResponse.success(res, 'Listing unpublished', listing);
});

export { createListing, getMyListings, getListingBySlug, updateListing, submitForReview, deleteListing, getAllListings, publishListing, unpublishListing };
