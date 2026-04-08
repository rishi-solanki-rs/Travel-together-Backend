import express from 'express';
import * as tribesController from './tribes.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	tribeListingParamsSchema,
	tribeParamsSchema,
	tribeEntryParamsSchema,
	createExperienceSchema,
	updateExperienceSchema,
	addScheduleSchema,
} from './tribes.validator.js';

const router = express.Router();

router.get('/listing/:listingId', validateRequest({ params: tribeListingParamsSchema }), tribesController.getExperience);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: tribeListingParamsSchema, body: createExperienceSchema }), tribesController.createExperience);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: tribeListingParamsSchema, body: updateExperienceSchema }), tribesController.updateExperience);
router.post('/listing/:listingId/schedule', authenticate, isVendorAdmin, validateRequest({ params: tribeListingParamsSchema, body: addScheduleSchema }), tribesController.addSchedule);

export default router;
