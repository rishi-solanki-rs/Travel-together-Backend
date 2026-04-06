import express from 'express';
import * as destinationsController from './destinations.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/type/:type', destinationsController.getByType);
router.get('/listing/:listingId', destinationsController.getPackage);
router.post('/listing/:listingId', authenticate, isVendorAdmin, destinationsController.createPackage);
router.put('/listing/:listingId', authenticate, isVendorAdmin, destinationsController.updatePackage);
router.post('/listing/:listingId/departures', authenticate, isVendorAdmin, destinationsController.addDepartureDate);

export default router;
