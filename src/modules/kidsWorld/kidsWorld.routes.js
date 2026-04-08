import express from 'express';
import * as kidsWorldController from './kidsWorld.controller.js';
import * as kidsWorldCommerceController from './kidsWorld.commerce.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	kidsListingParamsSchema,
	kidsParamsSchema,
	sessionParamsSchema,
	createActivitySchema,
	updateActivitySchema,
	addSessionSchema,
} from './kidsWorld.validator.js';

const router = express.Router();

router.get('/listing/:listingId', validateRequest({ params: kidsListingParamsSchema }), kidsWorldController.getActivity);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: kidsListingParamsSchema, body: createActivitySchema }), kidsWorldController.createActivity);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: kidsListingParamsSchema, body: updateActivitySchema }), kidsWorldController.updateActivity);
router.post('/listing/:listingId/sessions', authenticate, isVendorAdmin, validateRequest({ params: kidsListingParamsSchema, body: addSessionSchema }), kidsWorldController.addSession);

router.post('/commerce/guardians', authenticate, kidsWorldCommerceController.createGuardian);
router.post('/commerce/children', authenticate, kidsWorldCommerceController.createChild);
router.post('/commerce/bookings', authenticate, kidsWorldCommerceController.bookSession);
router.patch('/commerce/bookings/:bookingId/confirm', authenticate, kidsWorldCommerceController.confirmBooking);
router.patch('/commerce/bookings/:bookingId/cancel', authenticate, kidsWorldCommerceController.cancelBooking);
router.post('/commerce/bookings/:bookingId/attendance', authenticate, isVendorAdmin, kidsWorldCommerceController.attendance);
router.get('/commerce/vendor/calendar/:listingId', authenticate, isVendorAdmin, validateRequest({ params: kidsListingParamsSchema }), kidsWorldCommerceController.vendorCalendar);

export default router;
