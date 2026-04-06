import express from 'express';
import * as subscriptionsController from './subscriptions.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';

const router = express.Router();

router.post('/', authenticate, isVendorAdmin, subscriptionsController.create);
router.get('/my', authenticate, isVendorAdmin, subscriptionsController.getMySubscriptions);
router.patch('/:id/cancel', authenticate, isVendorAdmin, subscriptionsController.cancel);

router.get('/', authenticate, isAdmin, subscriptionsController.getAll);
router.patch('/:id/activate', authenticate, isAdmin, auditLog('activate_subscription', 'subscriptions'), subscriptionsController.activate);

export default router;
