import Page from '../../shared/models/Page.model.js';
import CMSSection from '../../shared/models/CMSSection.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import ApiError from '../../utils/ApiError.js';
import { cache } from '../../config/redis.js';
import { LISTING_STATUS, SLOT_STATUS } from '../../shared/constants/index.js';

const createPage = async (data, userId) => {
  return Page.create({ ...data, createdBy: userId });
};

const getPageBySlug = async (slug) => {
  const page = await Page.findOne({ slug, isDeleted: false }).populate('sections.sectionId').lean();
  if (!page) throw ApiError.notFound('Page not found');
  return page;
};

const updatePage = async (id, data, userId) => {
  const page = await Page.findOneAndUpdate({ _id: id, isDeleted: false }, { ...data, updatedBy: userId }, { new: true });
  if (!page) throw ApiError.notFound('Page not found');
  await cache.del(`page:render:${page.slug}`);
  return page;
};

const renderPage = async (slug, cityId = null) => {
  const cacheKey = `page:render:${slug}${cityId ? `:${cityId}` : ''}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const page = await Page.findOne({ slug, isDeleted: false, isPublished: true })
    .populate({
      path: 'sections.sectionId',
      match: { isActive: true, isDeleted: false },
    })
    .lean();

  if (!page) throw ApiError.notFound('Page not found');

  const now = new Date();
  const activeSections = page.sections
    .filter(s => s.sectionId && s.isVisible)
    .sort((a, b) => a.order - b.order)
    .map(s => s.sectionId)
    .filter(s => {
      if (!s.scheduledFrom && !s.scheduledTo) return true;
      const from = s.scheduledFrom ? new Date(s.scheduledFrom) : null;
      const to = s.scheduledTo ? new Date(s.scheduledTo) : null;
      if (from && to) return now >= from && now <= to;
      if (from) return now >= from;
      if (to) return now <= to;
      return true;
    });

  const enrichedSections = await Promise.all(
    activeSections.map(section => enrichSection(section, cityId))
  );

  const rendered = {
    page: {
      title: page.title,
      slug: page.slug,
      type: page.type,
      seoConfig: page.seoConfig,
    },
    sections: enrichedSections,
    renderedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, rendered, 300);
  return rendered;
};

const enrichSection = async (section, cityId) => {
  const enriched = { ...section };

  if (section.filters && Object.keys(section.filters).length > 0) {
    const filter = {
      isDeleted: false,
      isActive: true,
      status: LISTING_STATUS.PUBLISHED,
    };

    if (section.filters.categoryKey) filter['category'] = section.filters.categoryKey;
    if (section.filters.subtypeKey) filter['subtypeId'] = section.filters.subtypeKey;
    if (cityId || section.filters.cityId) filter['cityId'] = cityId || section.filters.cityId;
    if (section.filters.isFeatured) filter['isFeatured'] = true;

    const sort = { planPriority: -1, 'stats.views': -1 };
    const limit = section.filters.limit || 10;

    enriched.listings = await ListingBase.find(filter)
      .sort(sort)
      .limit(limit)
      .select('title slug coverImage pricing category subtypeId cityId isFeatured stats')
      .populate('cityId', 'name')
      .populate('subtypeId', 'name')
      .lean();
  }

  return enriched;
};

const getAllPages = async () => {
  return Page.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
};

const publishPage = async (id, userId) => {
  const page = await Page.findByIdAndUpdate(id, { isPublished: true, publishedAt: new Date(), updatedBy: userId }, { new: true });
  if (!page) throw ApiError.notFound('Page not found');
  await cache.del(`page:render:${page.slug}`);
  return page;
};

export { createPage, getPageBySlug, updatePage, renderPage, getAllPages, publishPage };
