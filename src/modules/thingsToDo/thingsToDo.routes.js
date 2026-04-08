import express from 'express';
import * as thingsToDoController from './thingsToDo.controller.js';
import * as thingsToDoCommerceController from './thingsToDo.commerce.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	itineraryListingParamsSchema,
	itineraryParamsSchema,
	departureParamsSchema,
	createItinerarySchema,
	updateItinerarySchema,
	addDepartureSchema,
	updateDepartureSchema,
	cancelDepartureSchema,
} from './thingsToDo.validator.js';

const router = express.Router();

router.get('/listing/:listingId/itineraries', validateRequest({ params: itineraryListingParamsSchema }), thingsToDoController.getItineraries);
router.post('/listing/:listingId/itineraries', authenticate, isVendorAdmin, validateRequest({ params: itineraryListingParamsSchema, body: createItinerarySchema }), thingsToDoController.createItinerary);
router.put('/itineraries/:id', authenticate, isVendorAdmin, validateRequest({ params: itineraryParamsSchema, body: updateItinerarySchema }), thingsToDoController.updateItinerary);

router.get('/listing/:listingId/departures', validateRequest({ params: itineraryListingParamsSchema }), thingsToDoController.getDepartures);
router.post('/listing/:listingId/itineraries/:itineraryId/departures', authenticate, isVendorAdmin, validateRequest({ params: departureParamsSchema, body: addDepartureSchema }), thingsToDoController.addDeparture);
router.put('/departures/:id', authenticate, isVendorAdmin, validateRequest({ params: itineraryParamsSchema, body: updateDepartureSchema }), thingsToDoController.updateDeparture);
router.patch('/departures/:id/cancel', authenticate, isVendorAdmin, validateRequest({ params: itineraryParamsSchema, body: cancelDepartureSchema }), thingsToDoController.cancelDeparture);

router.post('/commerce/reservations', authenticate, thingsToDoCommerceController.createReservationFlow);
router.post('/commerce/reservations/hold', authenticate, thingsToDoCommerceController.holdReservation);
router.patch('/commerce/reservations/:reservationId/confirm', authenticate, thingsToDoCommerceController.confirmReservationFlow);
router.patch('/commerce/reservations/:reservationId/cancel', authenticate, thingsToDoCommerceController.cancelReservationFlow);
router.get('/commerce/vendor/departures', authenticate, isVendorAdmin, thingsToDoCommerceController.vendorDashboard);

export default router;
