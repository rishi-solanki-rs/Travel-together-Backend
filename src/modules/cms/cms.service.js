import CMSSection from '../../shared/models/CMSSection.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { cache } from '../../config/redis.js';

const createSection = async (data, userId) => {
  const section = await CMSSection.create({ ...data, createdBy: userId });
  await cache.delPattern('cms:*');
  return section;
};

const updateSection = async (id, data, userId) => {
  const section = await CMSSection.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...data, updatedBy: userId },
    { new: true }
  );
  if (!section) throw ApiError.notFound('CMS section not found');
  await cache.delPattern('cms:*');
  return section;
};

const deleteSection = async (id) => {
  const section = await CMSSection.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false });
  if (!section) throw ApiError.notFound('CMS section not found');
  await cache.delPattern('cms:*');
};

const getSectionsByPage = async (pageId) => {
  const cacheKey = `cms:page:${pageId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const sections = await CMSSection.find({
    $or: [{ pageId }, { isGlobal: true }],
    isDeleted: false,
    isActive: true,
    $or: [
      { scheduledFrom: null, scheduledTo: null },
      { scheduledFrom: { $lte: now }, scheduledTo: { $gte: now } },
      { scheduledFrom: { $lte: now }, scheduledTo: null },
    ],
  })
    .sort({ order: 1 })
    .populate('categoryId', 'name key')
    .populate('subtypeId', 'name key')
    .populate('cityId', 'name slug')
    .populate('campaignId', 'title slug status')
    .lean();

  await cache.set(cacheKey, sections, 300);
  return sections;
};

const getSectionByIdentifier = async (identifier) => {
  const section = await CMSSection.findOne({ identifier, isDeleted: false }).lean();
  if (!section) throw ApiError.notFound('CMS section not found');
  return section;
};

const getAllSections = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.type) filter.type = query.type;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.isGlobal) filter.isGlobal = query.isGlobal === 'true';

  const [sections, total] = await Promise.all([
    CMSSection.find(filter).sort({ order: 1 }).skip(skip).limit(perPage)
      .populate('cityId', 'name').populate('pageId', 'title slug'),
    CMSSection.countDocuments(filter),
  ]);

  return { sections, pagination: buildPaginationMeta(page, perPage, total) };
};

const reorderSections = async (pageId, orderedIds, userId) => {
  const bulk = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, pageId },
      update: { $set: { order: index, updatedBy: userId } },
    },
  }));
  await CMSSection.bulkWrite(bulk);
  await cache.delPattern('cms:*');
};

export { createSection, updateSection, deleteSection, getSectionsByPage, getSectionByIdentifier, getAllSections, reorderSections };
