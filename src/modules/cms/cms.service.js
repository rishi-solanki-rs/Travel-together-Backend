import CMSSection from '../../shared/models/CMSSection.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { cache } from '../../config/redis.js';
import { recordAuditEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';

const buildScheduleVisibilityClause = (now = new Date()) => ({
  $or: [
    { scheduledFrom: null, scheduledTo: null },
    { scheduledFrom: null, scheduledTo: { $gte: now } },
    { scheduledFrom: { $lte: now }, scheduledTo: null },
    { scheduledFrom: { $lte: now }, scheduledTo: { $gte: now } },
  ],
});

const buildSectionVisibilityQuery = ({ pageId, now = new Date(), cityId = null }) => {
  const clauses = [
    { isDeleted: false, isActive: true },
    { $or: [{ pageId }, { isGlobal: true }] },
    buildScheduleVisibilityClause(now),
  ];

  if (cityId) {
    clauses.push({
      $or: [
        { cityId: null },
        { cityId },
      ],
    });
  }

  return { $and: clauses };
};

const createSection = async (data, userId) => {
  const section = await CMSSection.create({ ...data, createdBy: userId });
  await cache.invalidateBroad(['cms:', 'page:render:', 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'cms.section.published',
    module: 'cms',
    entityType: 'CMSSection',
    entityId: section._id,
    action: 'create-section',
    actor: { actorType: 'admin', actorId: userId },
    afterSnapshot: { isActive: section.isActive, pageId: section.pageId, identifier: section.identifier },
  });
  await enqueueJob('notifications', 'cms-publish-notify', { sectionId: String(section._id), pageId: String(section.pageId || '') });
  return section;
};

const updateSection = async (id, data, userId) => {
  const section = await CMSSection.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...data, updatedBy: userId },
    { new: true }
  );
  if (!section) throw ApiError.notFound('CMS section not found');
  await cache.invalidateBroad(['cms:', 'page:render:', 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'cms.section.updated',
    module: 'cms',
    entityType: 'CMSSection',
    entityId: section._id,
    action: 'update-section',
    actor: { actorType: 'admin', actorId: userId },
    afterSnapshot: { isActive: section.isActive, pageId: section.pageId, identifier: section.identifier },
  });
  await enqueueJob('notifications', 'cms-update-notify', { sectionId: String(section._id) });
  return section;
};

const deleteSection = async (id) => {
  const section = await CMSSection.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false });
  if (!section) throw ApiError.notFound('CMS section not found');
  await cache.invalidateBroad(['cms:', 'page:render:', 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'cms.section.deleted',
    module: 'cms',
    entityType: 'CMSSection',
    entityId: section._id,
    action: 'delete-section',
    afterSnapshot: { isDeleted: true, isActive: false },
  });
};

const getSectionsByPage = async (pageId, options = {}) => {
  const cityId = options.cityId || null;
  const cacheKey = `cms:page:${pageId}${cityId ? `:city:${cityId}` : ''}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const visibilityQuery = buildSectionVisibilityQuery({ pageId, now, cityId });
  const sections = await CMSSection.find(visibilityQuery)
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
  await cache.invalidateBroad(['cms:', 'page:render:', 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'cms.section.reordered',
    module: 'cms',
    entityType: 'Page',
    entityId: pageId,
    action: 'reorder-sections',
    actor: { actorType: 'admin', actorId: userId },
    metadata: { orderedIdsCount: orderedIds.length },
  });
};

export {
  createSection,
  updateSection,
  deleteSection,
  getSectionsByPage,
  getSectionByIdentifier,
  getAllSections,
  reorderSections,
  buildSectionVisibilityQuery,
};
