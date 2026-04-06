import express from 'express';
import * as listingsController from './listings.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.get('/public/:slug', listingsController.getListingBySlug);

router.post('/', authenticate, isVendorAdmin, listingsController.createListing);
router.get('/my', authenticate, isVendorAdmin, listingsController.getMyListings);
router.put('/:id', authenticate, isVendorAdmin, listingsController.updateListing);
router.patch('/:id/submit', authenticate, isVendorAdmin, listingsController.submitForReview);
router.delete('/:id', authenticate, isVendorAdmin, listingsController.deleteListing);

router.get('/', authenticate, isAdmin, listingsController.getAllListings);
router.patch('/:id/publish', authenticate, isAdmin, auditLog('publish_listing', 'listings'), listingsController.publishListing);
router.patch('/:id/unpublish', authenticate, isAdmin, auditLog('unpublish_listing', 'listings'), listingsController.unpublishListing);

export default router;
