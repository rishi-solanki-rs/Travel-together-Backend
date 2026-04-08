import express from 'express';
import * as listingsController from './listings.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { listingBodySchema, listingParamsSchema, listingSlugParamsSchema, listingUnpublishSchema } from './listings.validator.js';

const router = express.Router();

router.get('/public/:slug', validateRequest({ params: listingSlugParamsSchema }), listingsController.getListingBySlug);

router.post('/', authenticate, isVendorAdmin, validateRequest({ body: listingBodySchema }), listingsController.createListing);
router.get('/my', authenticate, isVendorAdmin, listingsController.getMyListings);
router.put('/:id', authenticate, isVendorAdmin, validateRequest({ params: listingParamsSchema, body: listingBodySchema.partial() }), listingsController.updateListing);
router.patch('/:id/submit', authenticate, isVendorAdmin, validateRequest({ params: listingParamsSchema }), listingsController.submitForReview);
router.delete('/:id', authenticate, isVendorAdmin, validateRequest({ params: listingParamsSchema }), listingsController.deleteListing);

router.get('/', authenticate, isAdmin, listingsController.getAllListings);
router.patch('/:id/publish', authenticate, isAdmin, validateRequest({ params: listingParamsSchema }), auditLog('publish_listing', 'listings'), listingsController.publishListing);
router.patch('/:id/unpublish', authenticate, isAdmin, validateRequest({ params: listingParamsSchema, body: listingUnpublishSchema }), auditLog('unpublish_listing', 'listings'), listingsController.unpublishListing);

export default router;
