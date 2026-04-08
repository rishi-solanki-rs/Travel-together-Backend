import express from 'express';
import * as analyticsController from './analytics.controller.js';
import { optionalAuthenticate, authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { analyticsTrackSchema } from './analytics.validator.js';

const router = express.Router();

router.post('/track', optionalAuthenticate, validateRequest({ body: analyticsTrackSchema }), analyticsController.track);
router.get('/my', authenticate, isVendorAdmin, analyticsController.getMyAnalytics);
router.get('/admin', authenticate, isAdmin, analyticsController.getAdminAnalytics);

export default router;
