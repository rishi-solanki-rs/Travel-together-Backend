import * as templatesService from './templates.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getForSubtype = asyncHandler(async (req, res) => {
  const template = await templatesService.getTemplate(req.params.subtypeId);
  ApiResponse.success(res, 'Template fetched', template);
});

const getAll = asyncHandler(async (req, res) => {
  const templates = await templatesService.getAllTemplates();
  ApiResponse.success(res, 'Templates fetched', templates);
});

const getById = asyncHandler(async (req, res) => {
  const template = await templatesService.getTemplateById(req.params.id);
  ApiResponse.success(res, 'Template fetched', template);
});

const create = asyncHandler(async (req, res) => {
  const template = await templatesService.createTemplate(req.body, req.user.id);
  ApiResponse.created(res, 'Template created', template);
});

const update = asyncHandler(async (req, res) => {
  const template = await templatesService.updateTemplate(req.params.id, req.body);
  ApiResponse.success(res, 'Template updated', template);
});

export { getForSubtype, getAll, getById, create, update };
