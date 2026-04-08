import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as service from './countries.service.js';

const getAll = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listCountries(req.query);
  ApiResponse.paginated(res, 'Countries fetched', items, pagination);
});

const getById = asyncHandler(async (req, res) => {
  const country = await service.getCountryById(req.params.id);
  ApiResponse.success(res, 'Country fetched', country);
});

const create = asyncHandler(async (req, res) => {
  const country = await service.createCountry(req.body, req.user?.id || null);
  ApiResponse.created(res, 'Country created', country);
});

const update = asyncHandler(async (req, res) => {
  const country = await service.updateCountry(req.params.id, req.body, req.user?.id || null);
  ApiResponse.success(res, 'Country updated', country);
});

const updateSection = asyncHandler(async (req, res) => {
  const country = await service.updateCountrySection(
    req.params.id,
    req.params.section,
    req.body,
    req.user?.id || null
  );
  ApiResponse.success(res, 'Country section updated', country);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteCountry(req.params.id, req.user?.id || null);
  ApiResponse.noContent(res);
});

export { getAll, getById, create, update, updateSection, remove };
