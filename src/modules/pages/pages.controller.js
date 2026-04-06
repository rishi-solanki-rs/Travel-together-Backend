import * as pagesService from './pages.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const render = asyncHandler(async (req, res) => {
  const payload = await pagesService.renderPage(req.params.slug, req.query.cityId);
  ApiResponse.success(res, 'Page rendered', payload);
});
const getAll = asyncHandler(async (req, res) => { const pages = await pagesService.getAllPages(); ApiResponse.success(res, 'Pages fetched', pages); });
const getBySlug = asyncHandler(async (req, res) => { const page = await pagesService.getPageBySlug(req.params.slug); ApiResponse.success(res, 'Page fetched', page); });
const create = asyncHandler(async (req, res) => { const page = await pagesService.createPage(req.body, req.user.id); ApiResponse.created(res, 'Page created', page); });
const update = asyncHandler(async (req, res) => { const page = await pagesService.updatePage(req.params.id, req.body, req.user.id); ApiResponse.success(res, 'Page updated', page); });
const publish = asyncHandler(async (req, res) => { const page = await pagesService.publishPage(req.params.id, req.user.id); ApiResponse.success(res, 'Page published', page); });

export { render, getAll, getBySlug, create, update, publish };
