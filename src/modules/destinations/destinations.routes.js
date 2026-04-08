import express from 'express';
import * as destinationsController from './destinations.controller.js';
import * as destinationsCommerceController from './destinations.commerce.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	destinationListingParamsSchema,
	destinationTypeParamsSchema,
	createPackageSchema,
	updatePackageSchema,
	addDepartureDateSchema,
} from './destinations.validator.js';

const router = express.Router();

router.get('/type/:type', validateRequest({ params: destinationTypeParamsSchema }), destinationsController.getByType);
router.get('/listing/:listingId', validateRequest({ params: destinationListingParamsSchema }), destinationsController.getPackage);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: destinationListingParamsSchema, body: createPackageSchema }), destinationsController.createPackage);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: destinationListingParamsSchema, body: updatePackageSchema }), destinationsController.updatePackage);
router.post('/listing/:listingId/departures', authenticate, isVendorAdmin, validateRequest({ params: destinationListingParamsSchema, body: addDepartureDateSchema }), destinationsController.addDepartureDate);

router.post('/commerce/inquiries', authenticate, destinationsCommerceController.createInquiryController);
router.post('/commerce/inquiries/:inquiryId/quotes', authenticate, isVendorAdmin, destinationsCommerceController.createQuoteController);
router.patch('/commerce/inquiries/:inquiryId/quotes/:quoteId/accept', authenticate, isVendorAdmin, destinationsCommerceController.acceptQuoteController);
router.patch('/commerce/itineraries/:itineraryId/status', authenticate, isVendorAdmin, destinationsCommerceController.updateItineraryStatusController);
router.get('/commerce/vendor/pipeline', authenticate, isVendorAdmin, destinationsCommerceController.vendorPipelineController);

export default router;
