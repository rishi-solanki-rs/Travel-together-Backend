import * as subscriptionsService from './subscriptions.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const create = asyncHandler(async (req, res) => { const sub = await subscriptionsService.createSubscription(req.user.vendorId, req.body); ApiResponse.created(res, 'Subscription created. Pending payment.', sub); });
const getMySubscriptions = asyncHandler(async (req, res) => { const subs = await subscriptionsService.getVendorSubscriptions(req.user.vendorId); ApiResponse.success(res, 'Subscriptions fetched', subs); });
const cancel = asyncHandler(async (req, res) => { const sub = await subscriptionsService.cancelSubscription(req.params.id, req.user.vendorId, req.body.reason); ApiResponse.success(res, 'Subscription cancelled', sub); });
const getAll = asyncHandler(async (req, res) => { const { subscriptions, pagination } = await subscriptionsService.getAllSubscriptions(req.query); ApiResponse.paginated(res, 'Subscriptions fetched', subscriptions, pagination); });
const activate = asyncHandler(async (req, res) => { const sub = await subscriptionsService.activateSubscription(req.params.id, req.body, req.user.id); ApiResponse.success(res, 'Subscription activated', sub); });

export { create, getMySubscriptions, cancel, getAll, activate };
