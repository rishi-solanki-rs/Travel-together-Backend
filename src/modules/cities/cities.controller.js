import * as citiesService from './cities.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getAll = asyncHandler(async (req, res) => {
  const { cities, pagination } = await citiesService.getAllCities(req.query);
  ApiResponse.paginated(res, 'Cities fetched', cities, pagination);
});

const getFeatured = asyncHandler(async (req, res) => {
  const cities = await citiesService.getFeaturedCities();
  ApiResponse.success(res, 'Featured cities fetched', cities);
});

const getByIdentifier = asyncHandler(async (req, res) => {
  const city = await citiesService.getCityByIdentifier(req.params.identifier);
  ApiResponse.success(res, 'City fetched', city);
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const city = await citiesService.getPublicCityBySlug(req.params.slug);
  ApiResponse.success(res, 'Public city page fetched', city);
});

const create = asyncHandler(async (req, res) => {
  const city = await citiesService.createCity(req.body);
  ApiResponse.created(res, 'City created', city);
});

const update = asyncHandler(async (req, res) => {
  const city = await citiesService.updateCity(req.params.id, req.body);
  ApiResponse.success(res, 'City updated', city);
});

const updateSection = asyncHandler(async (req, res) => {
  const city = await citiesService.updateCitySection(req.params.id, req.params.section, req.body);
  ApiResponse.success(res, 'City section updated', city);
});

const remove = asyncHandler(async (req, res) => {
  await citiesService.deleteCity(req.params.id);
  ApiResponse.noContent(res);
});

export { getAll, getFeatured, getByIdentifier, getPublicBySlug, create, update, updateSection, remove };
