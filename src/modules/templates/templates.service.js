import ListingTemplate from '../../shared/models/ListingTemplate.model.js';
import ApiError from '../../utils/ApiError.js';
import { cache } from '../../config/redis.js';

const getTemplate = async (subtypeId) => {
  const cacheKey = `template:subtype:${subtypeId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const template = await ListingTemplate.findOne({ subtypeId, isActive: true })
    .populate('categoryId', 'name key')
    .populate('subtypeId', 'name key')
    .lean();
  if (!template) throw ApiError.notFound('Template not found for this subtype');

  await cache.set(cacheKey, template, 3600);
  return template;
};

const getTemplateById = async (id) => {
  const template = await ListingTemplate.findById(id).lean();
  if (!template) throw ApiError.notFound('Template not found');
  return template;
};

const getAllTemplates = async () => {
  return ListingTemplate.find({ isActive: true }).populate('categoryId', 'name').populate('subtypeId', 'name').lean();
};

const createTemplate = async (data, userId) => {
  const template = await ListingTemplate.create({ ...data, createdBy: userId });
  await cache.delPattern('template:*');
  return template;
};

const updateTemplate = async (id, data) => {
  const template = await ListingTemplate.findByIdAndUpdate(id, { ...data, $inc: { version: 1 } }, { new: true });
  if (!template) throw ApiError.notFound('Template not found');
  await cache.delPattern('template:*');
  return template;
};

export { getTemplate, getTemplateById, getAllTemplates, createTemplate, updateTemplate };
