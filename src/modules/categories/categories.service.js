import Category from '../../shared/models/Category.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
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

const getTaxonomyInsights = async () => {
  const [categoryCounts, subcategoryCounts, cityLabelPerformance] = await Promise.all([
    ListingBase.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', totalListings: { $sum: 1 }, totalInquiries: { $sum: '$stats.inquiryCount' }, totalViews: { $sum: '$stats.views' } } },
      { $sort: { totalListings: -1 } },
    ]),
    ListingBase.aggregate([
      { $match: { isDeleted: false, subtypeId: { $ne: null } } },
      { $group: { _id: '$subtypeId', totalListings: { $sum: 1 }, totalViews: { $sum: '$stats.views' } } },
      { $sort: { totalViews: -1 } },
      { $limit: 20 },
    ]),
    ListingBase.aggregate([
      { $match: { isDeleted: false, cityId: { $ne: null } } },
      {
        $group: {
          _id: '$cityId',
          total: { $sum: 1 },
          sponsored: { $sum: { $cond: ['$labels.sponsored', 1, 0] } },
          popularChoice: { $sum: { $cond: ['$labels.popularChoice', 1, 0] } },
          superSaver: { $sum: { $cond: ['$labels.superSaver', 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  return {
    categoryCounts,
    mostSearchedSubcategories: subcategoryCounts,
    cityFilterPerformance: cityLabelPerformance,
  };
};

export { getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory, getTaxonomyInsights };
