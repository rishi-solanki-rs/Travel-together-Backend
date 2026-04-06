import express from 'express';
import * as slotsController from './slots.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';

const router = express.Router();

router.get('/featured/:slotType', slotsController.getFeatured);
router.get('/my', authenticate, isVendorAdmin, slotsController.getMySlots);

router.get('/inventory', authenticate, isAdmin, slotsController.getInventory);
router.post('/inventory', authenticate, isAdmin, slotsController.createInventory);
router.post('/assign', authenticate, isAdmin, slotsController.assign);
router.get('/', authenticate, isAdmin, slotsController.getAll);

export default router;
