import express from 'express';
import * as shopsController from './shops.controller.js';
import * as shopsCommerceController from './shops.commerce.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	catalogListingParamsSchema,
	catalogParamsSchema,
	productParamsSchema,
	catalogBodySchema,
	productBodySchema,
	productUpdateBodySchema,
	stockUpdateSchema,
} from './shops.validator.js';

const router = express.Router();

router.get('/listing/:listingId', validateRequest({ params: catalogListingParamsSchema }), shopsController.getCatalog);
router.post('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: catalogListingParamsSchema, body: catalogBodySchema }), shopsController.createCatalog);
router.put('/listing/:listingId', authenticate, isVendorAdmin, validateRequest({ params: catalogListingParamsSchema, body: catalogBodySchema.partial() }), shopsController.updateCatalog);
router.get('/:catalogId/products', validateRequest({ params: catalogParamsSchema }), shopsController.getProducts);
router.post('/:catalogId/products', authenticate, isVendorAdmin, validateRequest({ params: catalogParamsSchema, body: productBodySchema }), shopsController.addProduct);
router.put('/products/:id', authenticate, isVendorAdmin, validateRequest({ params: productParamsSchema, body: productUpdateBodySchema }), shopsController.updateProduct);
router.patch('/products/:id/stock', authenticate, isVendorAdmin, validateRequest({ params: productParamsSchema, body: stockUpdateSchema }), shopsController.updateStock);
router.delete('/products/:id', authenticate, isVendorAdmin, validateRequest({ params: productParamsSchema }), shopsController.deleteProduct);

router.post('/commerce/cart', authenticate, shopsCommerceController.upsertCartController);
router.post('/commerce/checkout', authenticate, shopsCommerceController.checkoutController);
router.patch('/commerce/orders/:orderId/status', authenticate, isVendorAdmin, shopsCommerceController.updateOrderStatusController);
router.get('/commerce/vendor/sales', authenticate, isVendorAdmin, shopsCommerceController.vendorSalesDashboardController);

export default router;
