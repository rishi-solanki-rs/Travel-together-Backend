import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as service from './states.service.js';

const getAll = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listStates(req.query);
  ApiResponse.paginated(res, 'States fetched', items, pagination);
});

const getById = asyncHandler(async (req, res) => {
  const state = await service.getStateById(req.params.id);
  ApiResponse.success(res, 'State fetched', state);
});

const create = asyncHandler(async (req, res) => {
  const state = await service.createState(req.body, req.user?.id || null);
  ApiResponse.created(res, 'State created', state);
});

const update = asyncHandler(async (req, res) => {
  const state = await service.updateState(req.params.id, req.body, req.user?.id || null);
  ApiResponse.success(res, 'State updated', state);
});

const updateSection = asyncHandler(async (req, res) => {
  const state = await service.updateStateSection(req.params.id, req.params.section, req.body, req.user?.id || null);
  ApiResponse.success(res, 'State section updated', state);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteState(req.params.id, req.user?.id || null);
  ApiResponse.noContent(res);
});

export { getAll, getById, create, update, updateSection, remove };
