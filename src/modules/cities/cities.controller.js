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

const getBySlug = asyncHandler(async (req, res) => {
  const city = await citiesService.getCityBySlug(req.params.slug);
  ApiResponse.success(res, 'City fetched', city);
});

const create = asyncHandler(async (req, res) => {
  const city = await citiesService.createCity(req.body);
  ApiResponse.created(res, 'City created', city);
});

const update = asyncHandler(async (req, res) => {
  const city = await citiesService.updateCity(req.params.id, req.body);
  ApiResponse.success(res, 'City updated', city);
});

export { getAll, getFeatured, getBySlug, create, update };
