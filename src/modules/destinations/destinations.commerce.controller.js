import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  createInquiry,
  createQuote,
  acceptQuoteAndBook,
  updateItineraryStatus,
  getVendorPackageCommerceDashboard,
} from './destinations.commerce.service.js';

const createInquiryController = asyncHandler(async (req, res) => {
  const inquiry = await createInquiry({
    listingId: req.body.listingId,
    packageId: req.body.packageId,
    vendorId: req.user.vendorId || req.body.vendorId,
    inquirerUserId: req.user.id,
    departureDate: req.body.departureDate || null,
    travelersCount: req.body.travelersCount || 1,
    notes: req.body.notes || null,
    passengers: req.body.passengers || [],
  });
  ApiResponse.created(res, 'Package inquiry created', inquiry);
});

const createQuoteController = asyncHandler(async (req, res) => {
  const quote = await createQuote({
    inquiryId: req.params.inquiryId,
    vendorId: req.user.vendorId,
    amount: req.body.amount || {},
    validUntil: req.body.validUntil || null,
    notes: req.body.notes || null,
    milestones: req.body.milestones || [],
  });
  ApiResponse.created(res, 'Quote created', quote);
});

const acceptQuoteController = asyncHandler(async (req, res) => {
  const itinerary = await acceptQuoteAndBook({
    inquiryId: req.params.inquiryId,
    quoteId: req.params.quoteId,
    vendorId: req.user.vendorId,
  });
  ApiResponse.success(res, 'Quote accepted and itinerary confirmed', itinerary);
});

const updateItineraryStatusController = asyncHandler(async (req, res) => {
  const itinerary = await updateItineraryStatus({
    itineraryId: req.params.itineraryId,
    status: req.body.status,
    vendorId: req.user.vendorId,
  });
  ApiResponse.success(res, 'Itinerary status updated', itinerary);
});

const vendorPipelineController = asyncHandler(async (req, res) => {
  const dashboard = await getVendorPackageCommerceDashboard(req.user.vendorId);
  ApiResponse.success(res, 'Package commerce dashboard fetched', dashboard);
});

export {
  createInquiryController,
  createQuoteController,
  acceptQuoteController,
  updateItineraryStatusController,
  vendorPipelineController,
};
