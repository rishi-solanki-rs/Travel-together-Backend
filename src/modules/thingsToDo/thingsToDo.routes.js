import express from 'express';
import * as thingsToDoController from './thingsToDo.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId/itineraries', thingsToDoController.getItineraries);
router.post('/listing/:listingId/itineraries', authenticate, isVendorAdmin, thingsToDoController.createItinerary);
router.put('/itineraries/:id', authenticate, isVendorAdmin, thingsToDoController.updateItinerary);

router.get('/listing/:listingId/departures', thingsToDoController.getDepartures);
router.post('/listing/:listingId/itineraries/:itineraryId/departures', authenticate, isVendorAdmin, thingsToDoController.addDeparture);
router.put('/departures/:id', authenticate, isVendorAdmin, thingsToDoController.updateDeparture);
router.patch('/departures/:id/cancel', authenticate, isVendorAdmin, thingsToDoController.cancelDeparture);

export default router;
