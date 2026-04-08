import express from 'express';
import * as slotsController from './slots.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isSuperAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { createInventorySchema, assignSlotSchema, assignmentIdParamsSchema, assignmentQuerySchema, slotAnalyticsQuerySchema } from './slots.validator.js';

const router = express.Router();

router.get('/featured/:slotType', slotsController.getFeatured);
router.get('/my', authenticate, isVendorAdmin, slotsController.getMySlots);

router.get('/inventory', authenticate, isAdmin, slotsController.getInventory);
router.post('/inventory', authenticate, isAdmin, validateRequest({ body: createInventorySchema }), slotsController.createInventory);
router.post('/assign', authenticate, isAdmin, validateRequest({ body: assignSlotSchema }), slotsController.assign);
router.patch('/:assignmentId/release', authenticate, isSuperAdmin, validateRequest({ params: assignmentIdParamsSchema }), auditLog('release_slot_assignment', 'slots'), slotsController.release);
router.get('/analytics', authenticate, isSuperAdmin, validateRequest({ query: slotAnalyticsQuerySchema }), slotsController.analytics);
router.get('/', authenticate, isAdmin, validateRequest({ query: assignmentQuerySchema }), slotsController.getAll);

export default router;
