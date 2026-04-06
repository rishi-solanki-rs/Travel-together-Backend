import * as kidsWorldService from './kidsWorld.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createActivity = asyncHandler(async (req, res) => { const a = await kidsWorldService.createActivity(req.params.listingId, req.user.vendorId, req.body); ApiResponse.created(res, 'Activity created', a); });
const getActivity = asyncHandler(async (req, res) => { const a = await kidsWorldService.getActivity(req.params.listingId); ApiResponse.success(res, 'Activity fetched', a); });
const updateActivity = asyncHandler(async (req, res) => { const a = await kidsWorldService.updateActivity(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Activity updated', a); });
const addSession = asyncHandler(async (req, res) => { const a = await kidsWorldService.addSession(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Session added', a); });

export { createActivity, getActivity, updateActivity, addSession };
