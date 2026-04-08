import express from 'express';
import * as subscriptionsController from './subscriptions.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
	createSubscriptionSchema,
	activateSubscriptionSchema,
	cancelSubscriptionSchema,
	renewSubscriptionSchema,
	retrySubscriptionSchema,
	changePlanSchema,
	subscriptionQuerySchema,
	subscriptionIdParamsSchema,
} from './subscriptions.validator.js';

const router = express.Router();

router.post('/', authenticate, isVendorAdmin, validateRequest({ body: createSubscriptionSchema }), subscriptionsController.create);
router.get('/my', authenticate, isVendorAdmin, subscriptionsController.getMySubscriptions);
router.patch('/:id/cancel', authenticate, isVendorAdmin, validateRequest({ params: subscriptionIdParamsSchema, body: cancelSubscriptionSchema }), subscriptionsController.cancel);
router.post('/:id/renew', authenticate, isVendorAdmin, validateRequest({ params: subscriptionIdParamsSchema, body: renewSubscriptionSchema }), subscriptionsController.renew);
router.post('/:id/retry', authenticate, isVendorAdmin, validateRequest({ params: subscriptionIdParamsSchema, body: retrySubscriptionSchema }), subscriptionsController.retry);
router.patch('/:id/change-plan', authenticate, isVendorAdmin, validateRequest({ params: subscriptionIdParamsSchema, body: changePlanSchema }), subscriptionsController.changePlan);

router.get('/', authenticate, isAdmin, validateRequest({ query: subscriptionQuerySchema }), subscriptionsController.getAll);
router.patch('/:id/activate', authenticate, isAdmin, validateRequest({ params: subscriptionIdParamsSchema, body: activateSubscriptionSchema }), auditLog('activate_subscription', 'subscriptions'), subscriptionsController.activate);

export default router;
