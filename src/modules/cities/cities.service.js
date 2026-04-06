import City from '../../shared/models/City.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';
import { cache } from '../../config/redis.js';

const getAllCities = async (query = {}) => {
  const cacheKey = `cities:all:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === 'true';
  if (query.state) filter.state = { $regex: query.state, $options: 'i' };
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const sort = buildSortQuery(query.sortBy || 'order', query.sortOrder || 'asc');
  const [cities, total] = await Promise.all([
    City.find(filter).sort(sort).skip(skip).limit(perPage).lean(),
    City.countDocuments(filter),
  ]);

  const result = { cities, pagination: buildPaginationMeta(page, perPage, total) };
  await cache.set(cacheKey, result, 1800);
  return result;
};

const getCityBySlug = async (slug) => {
  const city = await City.findOne({ slug, isDeleted: false })
    .populate('cmsOverrides.pageId', 'slug type')
    .lean();
  if (!city) throw ApiError.notFound('City not found');
  return city;
};

const createCity = async (data) => {
  data.slug = await generateUniqueSlug(data.name, City);
  const city = await City.create(data);
  await cache.delPattern('cities:*');
  return city;
};

const updateCity = async (id, data) => {
  if (data.name) data.slug = await generateUniqueSlug(data.name, City, 'slug', id);
  const city = await City.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
  if (!city) throw ApiError.notFound('City not found');
  await cache.delPattern('cities:*');
  return city;
};

const getFeaturedCities = async () => {
  const cached = await cache.get('cities:featured');
  if (cached) return cached;
  const cities = await City.find({ isFeatured: true, isActive: true, isDeleted: false }).sort({ order: 1 }).lean();
  await cache.set('cities:featured', cities, 3600);
  return cities;
};

export { getAllCities, getCityBySlug, createCity, updateCity, getFeaturedCities };
