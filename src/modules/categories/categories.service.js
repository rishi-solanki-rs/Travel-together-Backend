import Category from '../../shared/models/Category.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { cache } from '../../config/redis.js';

const CACHE_KEY = 'categories:all';

const getAllCategories = async (query = {}) => {
  const cached = await cache.get(CACHE_KEY);
  if (cached) return cached;

  const filter = { isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const categories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();
  await cache.set(CACHE_KEY, categories, 3600);
  return categories;
};

const getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug, isDeleted: false }).lean();
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

const createCategory = async (data) => {
  const slug = await generateUniqueSlug(data.name, Category);
  const category = await Category.create({ ...data, slug });
  await cache.del(CACHE_KEY);
  return category;
};

const updateCategory = async (id, data) => {
  if (data.name) data.slug = await generateUniqueSlug(data.name, Category, 'slug', id);
  const category = await Category.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
  if (!category) throw ApiError.notFound('Category not found');
  await cache.del(CACHE_KEY);
  return category;
};

const deleteCategory = async (id) => {
  const category = await Category.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true });
  if (!category) throw ApiError.notFound('Category not found');
  await cache.del(CACHE_KEY);
};

export { getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
