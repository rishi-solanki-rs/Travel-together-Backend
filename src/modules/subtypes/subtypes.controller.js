import * as subtypesService from './subtypes.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getAll = asyncHandler(async (req, res) => {
  const subtypes = await subtypesService.getAll(req.query);
  ApiResponse.success(res, 'Subtypes fetched', subtypes);
});

const getByCategory = asyncHandler(async (req, res) => {
  const subtypes = await subtypesService.getByCategory(req.params.categoryId, req.query);
  ApiResponse.success(res, 'Subtypes fetched', subtypes);
});

const getBySlug = asyncHandler(async (req, res) => {
  const subtype = await subtypesService.getBySlug(req.params.slug);
  ApiResponse.success(res, 'Subtype fetched', subtype);
});

const create = asyncHandler(async (req, res) => {
  const subtype = await subtypesService.create(req.body);
  ApiResponse.created(res, 'Subtype created', subtype);
});

const update = asyncHandler(async (req, res) => {
  const subtype = await subtypesService.update(req.params.id, req.body);
  ApiResponse.success(res, 'Subtype updated', subtype);
});

const updateFilterConfig = asyncHandler(async (req, res) => {
  const subtype = await subtypesService.updateFilterConfig(req.params.id, req.body.searchFilters || []);
  ApiResponse.success(res, 'Subtype filter config updated', subtype);
});

const remove = asyncHandler(async (req, res) => {
  await subtypesService.remove(req.params.id);
  ApiResponse.noContent(res);
});

export { getAll, getByCategory, getBySlug, create, update, updateFilterConfig, remove };
