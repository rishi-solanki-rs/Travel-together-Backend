import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as service from './areas.service.js';

const listAreas = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.getAreas(req.query);
  ApiResponse.paginated(res, 'Areas fetched', items, pagination);
});

const getArea = asyncHandler(async (req, res) => {
  const area = await service.getAreaById(req.params.id);
  ApiResponse.success(res, 'Area fetched', area);
});

const createArea = asyncHandler(async (req, res) => {
  const area = await service.createArea(req.body);
  ApiResponse.created(res, 'Area created', area);
});

const updateArea = asyncHandler(async (req, res) => {
  const area = await service.updateArea(req.params.id, req.body);
  ApiResponse.success(res, 'Area updated', area);
});

const removeArea = asyncHandler(async (req, res) => {
  await service.removeArea(req.params.id);
  ApiResponse.noContent(res);
});

export { listAreas, getArea, createArea, updateArea, removeArea };
