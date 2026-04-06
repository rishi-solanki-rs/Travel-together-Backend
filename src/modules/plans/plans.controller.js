import * as plansService from './plans.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getAll = asyncHandler(async (req, res) => { const plans = await plansService.getAll(); ApiResponse.success(res, 'Plans fetched', plans); });
const getById = asyncHandler(async (req, res) => { const plan = await plansService.getById(req.params.id); ApiResponse.success(res, 'Plan fetched', plan); });
const create = asyncHandler(async (req, res) => { const plan = await plansService.create(req.body, req.user.id); ApiResponse.created(res, 'Plan created', plan); });
const update = asyncHandler(async (req, res) => { const plan = await plansService.update(req.params.id, req.body); ApiResponse.success(res, 'Plan updated', plan); });

export { getAll, getById, create, update };
