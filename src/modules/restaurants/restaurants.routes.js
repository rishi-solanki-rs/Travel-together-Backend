import express from 'express';
import * as restaurantsController from './restaurants.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	restaurantListingParamsSchema,
	restaurantIdParamsSchema,
	menuCategoryParamsSchema,
	menuItemParamsSchema,
	restaurantMenuCreateParamsSchema,
	restaurantMenuItemCreateParamsSchema,
	restaurantProfileBodySchema,
	menuCategoryBodySchema,
	menuItemBodySchema,
	menuItemUpdateBodySchema,
} from './restaurants.validator.js';

const router = express.Router();

router.get('/listing/:listingId', validateRequest({ params: restaurantListingParamsSchema }), restaurantsController.getProfile);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: restaurantListingParamsSchema, body: restaurantProfileBodySchema }), restaurantsController.createProfile);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: restaurantListingParamsSchema, body: restaurantProfileBodySchema.partial() }), restaurantsController.updateProfile);
router.get('/:restaurantId/menu', validateRequest({ params: restaurantIdParamsSchema }), restaurantsController.getFullMenu);
router.post('/:restaurantId/menu-categories', authenticate, isVendorAdmin, validateRequest({ params: restaurantMenuCreateParamsSchema, body: menuCategoryBodySchema }), restaurantsController.addMenuCategory);
router.put('/menu-categories/:id', authenticate, isVendorAdmin, validateRequest({ params: menuCategoryParamsSchema, body: menuCategoryBodySchema.partial() }), restaurantsController.updateMenuCategory);
router.delete('/menu-categories/:id', authenticate, isVendorAdmin, validateRequest({ params: menuCategoryParamsSchema }), restaurantsController.deleteMenuCategory);
router.post('/:restaurantId/menu-categories/:categoryId/items', authenticate, isVendorAdmin, validateRequest({ params: restaurantMenuItemCreateParamsSchema, body: menuItemBodySchema }), restaurantsController.addMenuItem);
router.put('/menu-items/:id', authenticate, isVendorAdmin, validateRequest({ params: menuItemParamsSchema, body: menuItemUpdateBodySchema }), restaurantsController.updateMenuItem);
router.delete('/menu-items/:id', authenticate, isVendorAdmin, validateRequest({ params: menuItemParamsSchema }), restaurantsController.deleteMenuItem);

export default router;
