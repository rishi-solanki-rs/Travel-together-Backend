import * as tribesService from './tribes.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createExperience = asyncHandler(async (req, res) => { const e = await tribesService.createExperience(req.params.listingId, req.user.vendorId, req.body); ApiResponse.created(res, 'Experience created', e); });
const getExperience = asyncHandler(async (req, res) => { const e = await tribesService.getExperience(req.params.listingId); ApiResponse.success(res, 'Experience fetched', e); });
const updateExperience = asyncHandler(async (req, res) => { const e = await tribesService.updateExperience(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Experience updated', e); });
const addSchedule = asyncHandler(async (req, res) => { const e = await tribesService.addSchedule(req.params.listingId, req.user.vendorId, req.body); ApiResponse.success(res, 'Schedule added', e); });

export { createExperience, getExperience, updateExperience, addSchedule };
