import express from 'express';
import * as restaurantsController from './restaurants.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId', restaurantsController.getProfile);
router.post('/listing/:listingId', authenticate, isVendorAdmin, restaurantsController.createProfile);
router.put('/listing/:listingId', authenticate, isVendorAdmin, restaurantsController.updateProfile);
router.get('/:restaurantId/menu', restaurantsController.getFullMenu);
router.post('/:restaurantId/menu-categories', authenticate, isVendorAdmin, restaurantsController.addMenuCategory);
router.put('/menu-categories/:id', authenticate, isVendorAdmin, restaurantsController.updateMenuCategory);
router.delete('/menu-categories/:id', authenticate, isVendorAdmin, restaurantsController.deleteMenuCategory);
router.post('/:restaurantId/menu-categories/:categoryId/items', authenticate, isVendorAdmin, restaurantsController.addMenuItem);
router.put('/menu-items/:id', authenticate, isVendorAdmin, restaurantsController.updateMenuItem);
router.delete('/menu-items/:id', authenticate, isVendorAdmin, restaurantsController.deleteMenuItem);

export default router;
