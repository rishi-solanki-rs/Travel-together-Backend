import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as service from './attractions.service.js';

const getAll = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listAttractions(req.query);
  ApiResponse.paginated(res, 'Attractions fetched', items, pagination);
});

const getById = asyncHandler(async (req, res) => {
  const attraction = await service.getAttractionById(req.params.id);
  ApiResponse.success(res, 'Attraction fetched', attraction);
});

const create = asyncHandler(async (req, res) => {
  const attraction = await service.createAttraction(req.body, req.user?.id || null);
  ApiResponse.created(res, 'Attraction created', attraction);
});

const update = asyncHandler(async (req, res) => {
  const attraction = await service.updateAttraction(req.params.id, req.body, req.user?.id || null);
  ApiResponse.success(res, 'Attraction updated', attraction);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteAttraction(req.params.id, req.user?.id || null);
  ApiResponse.noContent(res);
});

export { getAll, getById, create, update, remove };
