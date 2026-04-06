import express from 'express';
import * as shopsController from './shops.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/listing/:listingId', shopsController.getCatalog);
router.post('/listing/:listingId', authenticate, isVendorAdmin, shopsController.createCatalog);
router.put('/listing/:listingId', authenticate, isVendorAdmin, shopsController.updateCatalog);
router.get('/:catalogId/products', shopsController.getProducts);
router.post('/:catalogId/products', authenticate, isVendorAdmin, shopsController.addProduct);
router.put('/products/:id', authenticate, isVendorAdmin, shopsController.updateProduct);
router.patch('/products/:id/stock', authenticate, isVendorAdmin, shopsController.updateStock);
router.delete('/products/:id', authenticate, isVendorAdmin, shopsController.deleteProduct);

export default router;
