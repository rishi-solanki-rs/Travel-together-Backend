import * as cmsService from './cms.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getAll = asyncHandler(async (req, res) => { const { sections, pagination } = await cmsService.getAllSections(req.query); ApiResponse.paginated(res, 'Sections fetched', sections, pagination); });
const getByPage = asyncHandler(async (req, res) => { const sections = await cmsService.getSectionsByPage(req.params.pageId); ApiResponse.success(res, 'CMS sections fetched', sections); });
const getByIdentifier = asyncHandler(async (req, res) => { const section = await cmsService.getSectionByIdentifier(req.params.identifier); ApiResponse.success(res, 'Section fetched', section); });
const create = asyncHandler(async (req, res) => { const section = await cmsService.createSection(req.body, req.user.id); ApiResponse.created(res, 'CMS section created', section); });
const update = asyncHandler(async (req, res) => { const section = await cmsService.updateSection(req.params.id, req.body, req.user.id); ApiResponse.success(res, 'CMS section updated', section); });
const remove = asyncHandler(async (req, res) => { await cmsService.deleteSection(req.params.id); ApiResponse.noContent(res); });
const reorder = asyncHandler(async (req, res) => { await cmsService.reorderSections(req.params.pageId, req.body.orderedIds, req.user.id); ApiResponse.success(res, 'Sections reordered'); });

export { getAll, getByPage, getByIdentifier, create, update, remove, reorder };
