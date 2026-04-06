import express from 'express';
import * as kidsWorldController from './kidsWorld.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId', kidsWorldController.getActivity);
router.post('/listing/:listingId', authenticate, isVendorAdmin, kidsWorldController.createActivity);
router.put('/listing/:listingId', authenticate, isVendorAdmin, kidsWorldController.updateActivity);
router.post('/listing/:listingId/sessions', authenticate, isVendorAdmin, kidsWorldController.addSession);

export default router;
