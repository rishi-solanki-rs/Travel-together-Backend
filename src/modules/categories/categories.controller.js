import * as categoriesService from './categories.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getAll = asyncHandler(async (req, res) => {
  const categories = await categoriesService.getAllCategories(req.query);
  ApiResponse.success(res, 'Categories fetched', categories);
});

const getBySlug = asyncHandler(async (req, res) => {
  const category = await categoriesService.getCategoryBySlug(req.params.slug);
  ApiResponse.success(res, 'Category fetched', category);
});

const create = asyncHandler(async (req, res) => {
  const category = await categoriesService.createCategory(req.body);
  ApiResponse.created(res, 'Category created', category);
});

const update = asyncHandler(async (req, res) => {
  const category = await categoriesService.updateCategory(req.params.id, req.body);
  ApiResponse.success(res, 'Category updated', category);
});

const remove = asyncHandler(async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  ApiResponse.noContent(res);
});

const insights = asyncHandler(async (req, res) => {
  const data = await categoriesService.getTaxonomyInsights();
  ApiResponse.success(res, 'Category insights fetched', data);
});

export { getAll, getBySlug, create, update, remove, insights };
