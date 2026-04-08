import Page from '../../shared/models/Page.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import SubType from '../../shared/models/SubType.model.js';
import ApiError from '../../utils/ApiError.js';
import { cache, withDistributedLock } from '../../config/redis.js';
import { LISTING_STATUS, SLOT_STATUS } from '../../shared/constants/index.js';
import env from '../../config/env.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';
import { recordAuditEvent } from '../../operations/audit/audit.service.js';

const isObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
const isBatchEnrichEnabled = env.FF_PAGES_BATCH_ENRICH !== false;

const buildRenderCacheKey = ({ slug, cityId, payloadMode }) =>
  `page:render:${slug}${cityId ? `:city:${cityId}` : ':city:default'}:mode:${payloadMode}`;

const buildSectionFragmentCacheKey = ({ sectionId, appliedCityId, filterHash, payloadMode }) =>
  `page:fragment:section:${sectionId}:city:${appliedCityId || 'default'}:hash:${filterHash}:mode:${payloadMode}`;

const buildFilterFingerprint = (filter, sort, limit, payloadMode) => JSON.stringify({
  filter,
  sort,
  limit,
  payloadMode,
});

const normalizePayloadMode = (mode) => (mode === 'compact' ? 'compact' : 'detailed');

const getPreferredImageUrl = (listing) => {
  const cover = listing?.coverImage || {};
  return cover?.variants?.mobile || cover?.mobile?.url || cover?.url || null;
};

const dedupeListingsById = (listings = []) => {
  const seen = new Set();
  const deduped = [];
  for (const listing of listings) {
    const id = String(listing?._id || listing?.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(listing);
  }
  return deduped;
};

const serializeCompactListingCard = (listing) => ({
  _id: listing._id,
  slug: listing.slug,
  title: listing.title,
  imageUrl: getPreferredImageUrl(listing),
  isFeatured: Boolean(listing.isFeatured),
  city: listing.cityId?.name || null,
  subtype: listing.subtypeId?.name || null,
  price: {
    currency: listing.pricing?.currency || 'INR',
    basePrice: listing.pricing?.basePrice ?? null,
    discountedPrice: listing.pricing?.discountedPrice ?? null,
  },
});

const serializeDetailedListingCard = (listing) => ({
  _id: listing._id,
  title: listing.title,
  slug: listing.slug,
  coverImage: listing.coverImage || null,
  pricing: listing.pricing || null,
  category: listing.category || null,
  subtypeId: listing.subtypeId || null,
  cityId: listing.cityId || null,
  isFeatured: Boolean(listing.isFeatured),
  stats: listing.stats || null,
});

const serializeListingCard = (listing, payloadMode) => (
  payloadMode === 'compact'
    ? serializeCompactListingCard(listing)
    : serializeDetailedListingCard(listing)
);

const buildCityOverrideMeta = (requestedCityId, section) => {
  const sectionCityId = section?.filters?.cityId || section?.cityId || null;
  const appliedCityId = requestedCityId || sectionCityId || null;
  const source = requestedCityId ? 'request' : sectionCityId ? 'section' : 'default';
  return { appliedCityId, source };
};

const buildSectionSerializer = (section, payloadMode) => {
  const base = {
    ...section,
    desktopImages: (section.desktopImages || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
    mobileImages: (section.mobileImages || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
  };

  if (payloadMode !== 'compact') return base;

  return {
    _id: base._id,
    title: base.title,
    identifier: base.identifier,
    type: base.type,
    description: base.description || null,
    order: base.order || 0,
    desktopImages: base.desktopImages,
    mobileImages: base.mobileImages,
    content: base.content || null,
    cta: base.cta || null,
    secondaryCta: base.secondaryCta || null,
    config: base.config || {},
    filters: base.filters || {},
  };
};

const resolveSubtypeKeys = async (sections) => {
  const subtypeKeys = [];
  for (const section of sections) {
    const key = section?.filters?.subtypeKey;
    if (key && !isObjectId(key)) subtypeKeys.push(key);
  }
  const uniqueKeys = Array.from(new Set(subtypeKeys));
  if (!uniqueKeys.length) return new Map();

  const subtypes = await SubType.find({ key: { $in: uniqueKeys }, isDeleted: false }).select('_id key').lean();
  return new Map(subtypes.map((subtype) => [subtype.key, String(subtype._id)]));
};

const buildSectionFilterPlan = (section, requestedCityId, subtypeKeyMap, payloadMode) => {
  const hasFilters = Boolean(section.filters && Object.keys(section.filters).length);
  if (!hasFilters) {
    return {
      sectionId: String(section._id),
      filterHash: null,
      cityMeta: buildCityOverrideMeta(requestedCityId, section),
      querySpec: null,
    };
  }

  const filter = {
    isDeleted: false,
    isActive: true,
    status: LISTING_STATUS.PUBLISHED,
  };

  if (section.filters.categoryKey) filter.category = section.filters.categoryKey;
  if (section.filters.isFeatured) filter.isFeatured = true;

  const subtypeKey = section.filters.subtypeKey;
  if (subtypeKey) {
    filter.subtypeId = isObjectId(subtypeKey) ? subtypeKey : subtypeKeyMap.get(subtypeKey) || null;
  }

  const cityMeta = buildCityOverrideMeta(requestedCityId, section);
  if (cityMeta.appliedCityId) filter.cityId = cityMeta.appliedCityId;

  const sort = { planPriority: -1, 'stats.views': -1, _id: 1 };
  const limit = Number(section.filters.limit || 10);
  const filterHash = buildFilterFingerprint(filter, sort, limit, payloadMode);

  return {
    sectionId: String(section._id),
    filterHash,
    cityMeta,
    querySpec: { filter, sort, limit, payloadMode },
  };
};

const getPageBySlug = async (slug) => {
  const page = await Page.findOne({ slug, isDeleted: false }).populate('sections.sectionId').lean();
  if (!page) throw ApiError.notFound('Page not found');
  return page;
};

const createPage = async (data, userId) => {
  return Page.create({ ...data, createdBy: userId });
};

const updatePage = async (id, data, userId) => {
  const page = await Page.findOneAndUpdate({ _id: id, isDeleted: false }, { ...data, updatedBy: userId }, { new: true });
  if (!page) throw ApiError.notFound('Page not found');
  await cache.invalidateBroad([`page:render:${page.slug}`, 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'pages.render.invalidated',
    module: 'pages',
    entityType: 'Page',
    entityId: page._id,
    action: 'update-page-invalidate',
    actor: { actorType: 'admin', actorId: userId },
    metadata: { slug: page.slug },
  });
  return page;
};

const renderPageCore = async (slug, requestedCityId, payloadMode) => {
  const cacheKey = buildRenderCacheKey({ slug, cityId: requestedCityId, payloadMode });
  const cached = await cache.get(cacheKey);
  if (cached) {
    incrementCounter('tii_page_render_cache_hits_total', 1, { slug });
    return {
      ...cached,
      meta: {
        ...(cached.meta || {}),
        cache: 'hit',
      },
    };
  }
  incrementCounter('tii_page_render_cache_miss_total', 1, { slug });

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

  const uniqueSections = [];
  const sectionIds = new Set();
  for (const section of activeSections) {
    const id = String(section._id || '');
    if (!id || sectionIds.has(id)) continue;
    sectionIds.add(id);
    uniqueSections.push(section);
  }

  const subtypeKeyMap = await resolveSubtypeKeys(uniqueSections);

  const sectionPlans = uniqueSections.map((section) => ({
    section,
    ...buildSectionFilterPlan(section, requestedCityId, subtypeKeyMap, payloadMode),
  }));

  const plansByFilterHash = new Map();
  for (const plan of sectionPlans) {
    if (!plan.filterHash || !plan.querySpec) continue;
    if (!plansByFilterHash.has(plan.filterHash)) {
      plansByFilterHash.set(plan.filterHash, []);
    }
    plansByFilterHash.get(plan.filterHash).push(plan);
  }

  const listingPool = new Map();
  const queryCountMeta = { listingQueryCount: 0, sectionFragmentHits: 0 };

  for (const [filterHash, plans] of plansByFilterHash.entries()) {
    const representative = plans[0];
    const fragmentCacheKey = buildSectionFragmentCacheKey({
      sectionId: representative.sectionId,
      appliedCityId: representative.cityMeta.appliedCityId,
      filterHash,
      payloadMode,
    });

    const cachedFragment = await cache.get(fragmentCacheKey);
    if (cachedFragment) {
      queryCountMeta.sectionFragmentHits += 1;
      listingPool.set(filterHash, cachedFragment);
      continue;
    }

    const { filter, sort, limit } = representative.querySpec;
    const projection = payloadMode === 'compact'
      ? 'title slug coverImage pricing category subtypeId cityId isFeatured'
      : 'title slug coverImage pricing category subtypeId cityId isFeatured stats';

    const listings = await ListingBase.find(filter)
      .sort(sort)
      .limit(limit)
      .select(projection)
      .populate('cityId', 'name slug')
      .populate('subtypeId', 'name key')
      .lean();

    queryCountMeta.listingQueryCount += 1;
    const dedupedListings = dedupeListingsById(listings).map((listing) => serializeListingCard(listing, payloadMode));
    listingPool.set(filterHash, dedupedListings);

    await Promise.all(plans.map((plan) => {
      const key = buildSectionFragmentCacheKey({
        sectionId: plan.sectionId,
        appliedCityId: plan.cityMeta.appliedCityId,
        filterHash,
        payloadMode,
      });
      return cache.set(key, dedupedListings, 300);
    }));
  }

  const enrichedSections = sectionPlans.map((plan) => {
    const serializedSection = buildSectionSerializer(plan.section, payloadMode);
    const listings = plan.filterHash ? listingPool.get(plan.filterHash) || [] : [];
    return {
      ...serializedSection,
      listings,
      cityOverride: plan.cityMeta,
    };
  });

  const estimatedPayloadBytes = Buffer.byteLength(JSON.stringify({
    page: { title: page.title, slug: page.slug, type: page.type, seoConfig: page.seoConfig },
    sections: enrichedSections,
  }), 'utf8');

  const rendered = {
    page: {
      title: page.title,
      slug: page.slug,
      type: page.type,
      seoConfig: page.seoConfig,
    },
    sections: enrichedSections,
    meta: {
      payloadMode,
      appliedCityId: requestedCityId || null,
      compressionHint: estimatedPayloadBytes > 120 * 1024 ? 'consider_gzip_or_brotli' : 'within_target',
      estimatedPayloadBytes,
      ...queryCountMeta,
      batchEngineEnabled: isBatchEnrichEnabled,
    },
    renderedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, rendered, 300);
  return {
    ...rendered,
    meta: {
      ...(rendered.meta || {}),
      cache: 'miss',
    },
  };
};

const renderPage = async (slug, cityIdOrOptions = null) => {
  const options = (typeof cityIdOrOptions === 'object' && cityIdOrOptions !== null)
    ? cityIdOrOptions
    : { cityId: cityIdOrOptions };

  const requestedCityId = options.cityId || null;
  const payloadMode = normalizePayloadMode(options.payloadMode || options.mode || 'detailed');

  if (!isBatchEnrichEnabled) {
    return renderPageCore(slug, requestedCityId, payloadMode);
  }

  const cacheKey = buildRenderCacheKey({ slug, cityId: requestedCityId, payloadMode });
  const lockKey = `${cacheKey}:lock`;

  const lockResult = await withDistributedLock(lockKey, async () => {
    return renderPageCore(slug, requestedCityId, payloadMode);
  }, { ttlSeconds: 15 });

  if (lockResult.executed) return lockResult.value;

  const fallbackCached = await cache.get(cacheKey);
  if (fallbackCached) {
    return {
      ...fallbackCached,
      meta: {
        ...(fallbackCached.meta || {}),
        cache: 'fallback-hit',
      },
    };
  }

  return renderPageCore(slug, requestedCityId, payloadMode);
};

const getAllPages = async () => {
  return Page.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
};

const publishPage = async (id, userId) => {
  const page = await Page.findByIdAndUpdate(id, { isPublished: true, publishedAt: new Date(), updatedBy: userId }, { new: true });
  if (!page) throw ApiError.notFound('Page not found');
  await cache.invalidateBroad([`page:render:${page.slug}`, 'page:fragment:']);
  await recordAuditEvent({
    eventType: 'pages.published',
    module: 'pages',
    entityType: 'Page',
    entityId: page._id,
    action: 'publish-page',
    actor: { actorType: 'admin', actorId: userId },
    afterSnapshot: { isPublished: true, slug: page.slug },
  });
  return page;
};

export {
  createPage,
  getPageBySlug,
  updatePage,
  renderPage,
  getAllPages,
  publishPage,
  buildRenderCacheKey,
  buildSectionFragmentCacheKey,
  buildFilterFingerprint,
  buildCityOverrideMeta,
  buildSectionFilterPlan,
  dedupeListingsById,
  serializeListingCard,
  getPreferredImageUrl,
};
