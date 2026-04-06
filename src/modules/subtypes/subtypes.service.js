import SubType from '../../shared/models/SubType.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { cache } from '../../config/redis.js';

const getByCategory = async (categoryId, query = {}) => {
  const cacheKey = `subtypes:cat:${categoryId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const filter = { categoryId, isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const subtypes = await SubType.find(filter).sort({ order: 1 }).populate('templateId', 'name key').lean();
  await cache.set(cacheKey, subtypes, 3600);
  return subtypes;
};

const getBySlug = async (slug) => {
  const subtype = await SubType.findOne({ slug, isDeleted: false }).populate('categoryId', 'name key').populate('templateId').lean();
  if (!subtype) throw ApiError.notFound('Subtype not found');
  return subtype;
};

const create = async (data) => {
  data.slug = await generateUniqueSlug(data.name, SubType);
  const subtype = await SubType.create(data);
  await cache.delPattern('subtypes:*');
  return subtype;
};

const update = async (id, data) => {
  if (data.name) data.slug = await generateUniqueSlug(data.name, SubType, 'slug', id);
  const subtype = await SubType.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
  if (!subtype) throw ApiError.notFound('Subtype not found');
  await cache.delPattern('subtypes:*');
  return subtype;
};

const remove = async (id) => {
  const subtype = await SubType.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false });
  if (!subtype) throw ApiError.notFound('Subtype not found');
  await cache.delPattern('subtypes:*');
};

export { getByCategory, getBySlug, create, update, remove };
