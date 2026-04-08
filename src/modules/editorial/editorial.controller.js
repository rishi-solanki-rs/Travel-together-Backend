import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import {
  createEditorial,
  updateEditorial,
  removeEditorial,
  listEditorial,
  getEditorialById,
} from './editorial.service.js';

const listPublicEditorial = asyncHandler(async (req, res) => {
  const result = await listEditorial({ query: req.query, publicOnly: true });
  ApiResponse.paginated(res, 'Editorial blocks fetched', result.items, result.pagination);
});

const getPublicEditorial = asyncHandler(async (req, res) => {
  const row = await getEditorialById({ id: req.params.id, publicOnly: true });
  ApiResponse.success(res, 'Editorial block fetched', row);
});

const listAdminEditorial = asyncHandler(async (req, res) => {
  const result = await listEditorial({ query: req.query, publicOnly: false });
  ApiResponse.paginated(res, 'Admin editorial blocks fetched', result.items, result.pagination);
});

const createAdminEditorial = asyncHandler(async (req, res) => {
  const row = await createEditorial(req.body);
  ApiResponse.created(res, 'Editorial block created', row);
});

const updateAdminEditorial = asyncHandler(async (req, res) => {
  const row = await updateEditorial({ id: req.params.id, payload: req.body });
  ApiResponse.success(res, 'Editorial block updated', row);
});

const deleteAdminEditorial = asyncHandler(async (req, res) => {
  await removeEditorial(req.params.id);
  ApiResponse.success(res, 'Editorial block removed');
});

export {
  listPublicEditorial,
  getPublicEditorial,
  listAdminEditorial,
  createAdminEditorial,
  updateAdminEditorial,
  deleteAdminEditorial,
};
