import express from 'express';
import * as tribesController from './tribes.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId', tribesController.getExperience);
router.post('/listing/:listingId', authenticate, isVendorAdmin, tribesController.createExperience);
router.put('/listing/:listingId', authenticate, isVendorAdmin, tribesController.updateExperience);
router.post('/listing/:listingId/schedule', authenticate, isVendorAdmin, tribesController.addSchedule);

export default router;
