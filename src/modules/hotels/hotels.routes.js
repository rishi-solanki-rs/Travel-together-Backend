import express from 'express';
import * as hotelsController from './hotels.controller.js';
import * as hotelsCommerceController from './hotels.commerce.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin, isAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	hotelListingParamsSchema,
	hotelIdParamsSchema,
	roomIdParamsSchema,
	hotelRoomPricingParamsSchema,
	hotelProfileSchema,
	createRoomSchema,
	updateRoomSchema,
	setPricingSchema,
	setBlackoutSchema,
} from './hotels.validator.js';

const router = express.Router();

router.get('/listing/:listingId', validateRequest({ params: hotelListingParamsSchema }), hotelsController.getProfile);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: hotelListingParamsSchema, body: hotelProfileSchema }), hotelsController.createProfile);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: hotelListingParamsSchema, body: hotelProfileSchema.partial() }), hotelsController.updateProfile);

router.post('/:hotelId/rooms', authenticate, isVendorAdmin, validateRequest({ params: hotelIdParamsSchema, body: createRoomSchema }), hotelsController.addRoom);
router.get('/:hotelId/rooms', validateRequest({ params: hotelIdParamsSchema }), hotelsController.getRooms);
router.put('/rooms/:roomId', authenticate, isVendorAdmin, validateRequest({ params: roomIdParamsSchema, body: updateRoomSchema }), hotelsController.updateRoom);
router.delete('/rooms/:roomId', authenticate, isVendorAdmin, validateRequest({ params: roomIdParamsSchema }), hotelsController.deleteRoom);

router.post('/:hotelId/rooms/:roomId/pricing', authenticate, isVendorAdmin, validateRequest({ params: hotelRoomPricingParamsSchema, body: setPricingSchema }), hotelsController.setPricing);
router.get('/rooms/:roomId/pricing', validateRequest({ params: roomIdParamsSchema }), hotelsController.getPricing);
router.post('/:hotelId/blackout', authenticate, isVendorAdmin, validateRequest({ params: hotelIdParamsSchema, body: setBlackoutSchema }), hotelsController.setBlackout);

router.post('/commerce/bookings', authenticate, hotelsCommerceController.create);
router.post('/commerce/bookings/hold', authenticate, hotelsCommerceController.hold);
router.patch('/commerce/bookings/:bookingId/confirm', authenticate, hotelsCommerceController.confirm);
router.patch('/commerce/bookings/:bookingId/cancel', authenticate, hotelsCommerceController.cancel);
router.patch('/commerce/bookings/:bookingId/check-in', authenticate, isVendorAdmin, hotelsCommerceController.checkIn);
router.patch('/commerce/bookings/:bookingId/check-out', authenticate, isVendorAdmin, hotelsCommerceController.checkOut);
router.get('/commerce/vendor/bookings', authenticate, isVendorAdmin, hotelsCommerceController.vendorBookings);
router.get('/commerce/rooms/:roomId/occupancy', authenticate, isVendorAdmin, hotelsCommerceController.occupancy);

export default router;
