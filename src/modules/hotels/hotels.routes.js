import express from 'express';
import * as hotelsController from './hotels.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin, isAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId', hotelsController.getProfile);
router.post('/listing/:listingId', authenticate, isVendorAdmin, hotelsController.createProfile);
router.put('/listing/:listingId', authenticate, isVendorAdmin, hotelsController.updateProfile);

router.post('/:hotelId/rooms', authenticate, isVendorAdmin, hotelsController.addRoom);
router.get('/:hotelId/rooms', hotelsController.getRooms);
router.put('/rooms/:roomId', authenticate, isVendorAdmin, hotelsController.updateRoom);
router.delete('/rooms/:roomId', authenticate, isVendorAdmin, hotelsController.deleteRoom);

router.post('/:hotelId/rooms/:roomId/pricing', authenticate, isVendorAdmin, hotelsController.setPricing);
router.get('/rooms/:roomId/pricing', hotelsController.getPricing);
router.post('/:hotelId/blackout', authenticate, isVendorAdmin, hotelsController.setBlackout);

export default router;
