import City from '../../shared/models/City.model.js';
import Attraction from '../../shared/models/Attraction.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug, slugify } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';
import { cache } from '../../config/redis.js';
import { objectIdRegex } from '../../shared/validators/commonSchemas.js';
import {
  bannerSectionSchema,
  storySectionSchema,
  introductionSectionSchema,
  fraudSectionSchema,
  attractionsSectionSchema,
  experiencesSectionSchema,
  gallerySectionSchema,
  faqSectionSchema,
  modulesSectionSchema,
} from './cities.validator.js';

const SECTION_ALIAS_TO_KEY = {
  cityBanner: 'banner',
  banner: 'banner',
  story: 'story',
  introduction: 'introduction',
  fraud: 'fraud',
  attractions: 'attractions',
  experiences: 'experiences',
  throughTheLenses: 'gallery',
  gallery: 'gallery',
  faqs: 'faqs',
  modules: 'modules',
};

const DEFAULT_SECTIONS = {
  banner: {
    cityName: '',
    slug: '',
    tier: '',
    stateId: null,
    countryId: null,
    continent: '',
    famousFor: '',
    popularName: '',
    direction: '',
    modules: {},
    banners: [],
  },
  story: { storyBlocks: [] },
  introduction: { mainContent: '', extraDescriptions: [] },
  fraud: { fraudAlerts: [] },
  attractions: { attractionIds: [], featuredAttractions: [] },
  experiences: { experiences: [] },
  gallery: { featuredImages: [], extraImages: [], featuredVideo: null, extraVideos: [] },
  faqs: { faqs: [] },
  modules: {
    hotels: { status: false },
    tours: { status: false },
    restaurants: { status: false },
    shopping: { status: false },
  },
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asString = (value) => String(value || '').trim();
const asBool = (value) => !!value;
const asOrder = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const sortByOrder = (items = []) => {
  return [...items].sort((a, b) => asOrder(a.order) - asOrder(b.order));
};

const sortAndReorder = (items = []) => {
  return sortByOrder(items).map((item, index) => ({ ...item, order: index + 1 }));
};

const compactObject = (input) => {
  if (Array.isArray(input)) {
    return input.map(compactObject).filter((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    });
  }

  if (input && typeof input === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(input)) {
      const compacted = compactObject(value);
      if (compacted === null || compacted === undefined) continue;
      if (typeof compacted === 'string' && compacted.trim() === '') continue;
      if (Array.isArray(compacted) && compacted.length === 0) continue;
      if (
        typeof compacted === 'object' &&
        !Array.isArray(compacted) &&
        Object.keys(compacted).length === 0
      ) {
        continue;
      }
      result[key] = compacted;
    }
    return result;
  }

  return input;
};

const normalizeMediaItem = (item, index = 0) => {
  const url = asString(item?.url || item?.src || item?.banner || item?.bannerImage);
  if (!url) return null;
  return {
    type: item?.type || 'image',
    url,
    seoMetadata: asString(item?.seoMetadata || item?.seo),
    publicId: asString(item?.publicId),
    order: asOrder(item?.order, index + 1),
  };
};

const normalizeMediaArray = (items = []) => {
  return sortAndReorder(
    asArray(items)
      .map((item, index) => normalizeMediaItem(item, index))
      .filter(Boolean)
  );
};

const canonicalSectionKey = (section) => SECTION_ALIAS_TO_KEY[section] || section;

const normalizeBannerSection = (payload = {}, city = null) => {
  const parsed = bannerSectionSchema.parse(payload);
  const legacyBanners = asArray(city?.bannerMedia || city?.content?.banner?.banners);
  const banners = normalizeMediaArray(parsed.banners?.length ? parsed.banners : legacyBanners);

  return {
    ...DEFAULT_SECTIONS.banner,
    cityName: asString(parsed.cityName || city?.name),
    slug: asString(parsed.slug || city?.slug),
    tier: asString(parsed.tier || city?.tier),
    stateId: parsed.stateId || city?.stateId || null,
    countryId: parsed.countryId || city?.countryId || null,
    continent: asString(parsed.continent || city?.continent),
    famousFor: asString(parsed.famousFor || city?.famousFor),
    popularName: asString(parsed.popularName || city?.popularName),
    direction: asString(parsed.direction || city?.direction),
    modules: parsed.modules || city?.content?.banner?.modules || {},
    banners,
  };
};

const normalizeStorySection = (payload = {}, city = null) => {
  const parsed = storySectionSchema.parse(payload);
  const legacy = asArray(city?.storyBlocks || city?.content?.story?.storyBlocks);
  const source = parsed.storyBlocks?.length ? parsed.storyBlocks : legacy;

  const storyBlocks = sortAndReorder(
    source
      .map((block, index) => ({
        year: block?.year,
        title: asString(block?.title),
        content: asString(block?.content),
        media: normalizeMediaArray(block?.media),
        order: asOrder(block?.order, index + 1),
      }))
      .filter((block) => block.title || block.content)
  );

  return { storyBlocks };
};

const normalizeIntroductionSection = (payload = {}, city = null) => {
  const parsed = introductionSectionSchema.parse(payload);
  const extraDescriptions = asArray(
    parsed.extraDescriptions?.length
      ? parsed.extraDescriptions
      : city?.introduction?.extraDescriptions || city?.extraDescriptions
  )
    .map((item) => asString(item))
    .filter(Boolean);

  return {
    mainContent: asString(parsed.mainContent || city?.introduction?.mainContent || city?.mainContent),
    extraDescriptions,
  };
};

const normalizeFraudSection = (payload = {}, city = null) => {
  const parsed = fraudSectionSchema.parse(payload);
  const alerts = asArray(parsed.fraudAlerts?.length ? parsed.fraudAlerts : city?.fraud?.fraudAlerts)
    .map((item) => asString(item))
    .filter(Boolean);

  if (!alerts.length) {
    const fallback = asString(city?.fraudInfo?.content || city?.fraudContent || payload?.content);
    return { fraudAlerts: fallback ? [fallback] : [] };
  }

  return { fraudAlerts: alerts };
};

const normalizeAttractionsSection = (payload = {}, city = null) => {
  const parsed = attractionsSectionSchema.parse(payload);
  const legacyIds = asArray(
    city?.content?.attractions?.attractionIds ||
      city?.linkedAttractions?.map((item) => item?._id || item?.id)
  );

  const attractionIds = asArray(parsed.attractionIds?.length ? parsed.attractionIds : legacyIds)
    .map((id) => String(id))
    .filter((id) => objectIdRegex.test(id));

  const featuredAttractions = asArray(parsed.featuredAttractions)
    .map((id) => String(id))
    .filter((id) => objectIdRegex.test(id));

  return {
    attractionIds: [...new Set(attractionIds)],
    featuredAttractions: [...new Set(featuredAttractions)],
  };
};

const normalizeExperiencesSection = (payload = {}, city = null) => {
  const parsed = experiencesSectionSchema.parse(payload);
  const legacySource =
    asArray(city?.content?.experiences?.experiences).length > 0
      ? city?.content?.experiences?.experiences
      : asArray(city?.linkedExperiences || city?.experiences);
  const source = parsed.experiences?.length ? parsed.experiences : legacySource;

  const experiences = sortAndReorder(
    source
      .map((item, index) => ({
        title: asString(item?.title),
        subtitle: asString(item?.subtitle),
        userName: asString(item?.userName),
        rating: item?.rating !== undefined ? Number(item.rating) : undefined,
        media: normalizeMediaArray(item?.media),
        designation: asString(item?.designation),
        order: asOrder(item?.order, index + 1),
      }))
      .filter((item) => item.title)
  );

  return { experiences };
};

const normalizeGallerySection = (payload = {}, city = null) => {
  const parsed = gallerySectionSchema.parse(payload);
  const legacyLens = city?.content?.gallery || city?.throughTheLens || {};

  const featuredImages = normalizeMediaArray(
    parsed.featuredImages?.length
      ? parsed.featuredImages
      : legacyLens?.featuredImages || legacyLens?.imagesSection?.featured
  );
  const extraImages = normalizeMediaArray(
    parsed.extraImages?.length
      ? parsed.extraImages
      : legacyLens?.extraImages || legacyLens?.imagesSection?.extra
  );
  const featuredVideo =
    normalizeMediaItem(parsed.featuredVideo) ||
    normalizeMediaItem(legacyLens?.featuredVideo || asArray(legacyLens?.videosSection || legacyLens?.videos)[0]);
  const extraVideos = normalizeMediaArray(
    parsed.extraVideos?.length
      ? parsed.extraVideos
      : asArray(legacyLens?.extraVideos || legacyLens?.videosSection || legacyLens?.videos).slice(1)
  );

  return { featuredImages, extraImages, featuredVideo, extraVideos };
};

const normalizeFaqsSection = (payload = {}, city = null) => {
  const parsed = faqSectionSchema.parse(payload);
  const source = parsed.faqs?.length ? parsed.faqs : asArray(city?.linkedFAQs || city?.linkedFaqs || city?.faqs);

  const faqs = sortAndReorder(
    source
      .map((item, index) => ({
        question: asString(item?.question),
        answer: asString(item?.answer),
        order: asOrder(item?.order, index + 1),
      }))
      .filter((item) => item.question && item.answer)
  );

  return { faqs };
};

const normalizeModuleCard = (item = {}) => {
  return {
    status: asBool(item?.status || item?.showModule),
    title: asString(item?.title),
    famousFor: asString(item?.famousFor || item?.popularFor),
    display: asString(item?.display || 'grid'),
    bannerMedia: normalizeMediaArray(item?.bannerMedia || item?.images),
  };
};

const normalizeModulesSection = (payload = {}, city = null) => {
  const parsed = modulesSectionSchema.parse(payload);
  const source = {
    ...city?.content?.modules,
    ...parsed,
  };

  return {
    hotels: normalizeModuleCard(source.hotels),
    tours: normalizeModuleCard(source.tours),
    restaurants: normalizeModuleCard(source.restaurants),
    shopping: normalizeModuleCard(source.shopping || source.shops),
  };
};

const normalizeSectionPayload = (section, payload, city = null) => {
  const key = canonicalSectionKey(section);

  switch (key) {
    case 'banner':
      return { key, data: normalizeBannerSection(payload, city) };
    case 'story':
      return { key, data: normalizeStorySection(payload, city) };
    case 'introduction':
      return { key, data: normalizeIntroductionSection(payload, city) };
    case 'fraud':
      return { key, data: normalizeFraudSection(payload, city) };
    case 'attractions':
      return { key, data: normalizeAttractionsSection(payload, city) };
    case 'experiences':
      return { key, data: normalizeExperiencesSection(payload, city) };
    case 'gallery':
      return { key, data: normalizeGallerySection(payload, city) };
    case 'faqs':
      return { key, data: normalizeFaqsSection(payload, city) };
    case 'modules':
      return { key, data: normalizeModulesSection(payload, city) };
    default:
      throw ApiError.badRequest('Invalid city section');
  }
};

const buildSectionFlags = (sections) => ({
  heroEnabled: sections.banner.banners.length > 0 || !!sections.banner.cityName,
  storyEnabled: sections.story.storyBlocks.length > 0,
  introEnabled: !!sections.introduction.mainContent,
  fraudEnabled: sections.fraud.fraudAlerts.length > 0,
  attractionsEnabled: sections.attractions.attractionIds.length > 0,
  experiencesEnabled: sections.experiences.experiences.length > 0,
  galleryEnabled:
    sections.gallery.featuredImages.length > 0 ||
    sections.gallery.extraImages.length > 0 ||
    !!sections.gallery.featuredVideo ||
    sections.gallery.extraVideos.length > 0,
  faqsEnabled: sections.faqs.faqs.length > 0,
  modulesEnabled: Object.values(sections.modules).some((moduleSection) => moduleSection.status),
});

const buildCanonicalFromCity = (city) => {
  return {
    banner: normalizeBannerSection(city?.content?.banner || city?.content?.cityBanner || {}, city),
    story: normalizeStorySection(city?.content?.story || {}, city),
    introduction: normalizeIntroductionSection(city?.content?.introduction || {}, city),
    fraud: normalizeFraudSection(city?.content?.fraud || {}, city),
    attractions: normalizeAttractionsSection(city?.content?.attractions || {}, city),
    experiences: normalizeExperiencesSection(city?.content?.experiences || {}, city),
    gallery: normalizeGallerySection(city?.content?.gallery || city?.content?.throughTheLenses || {}, city),
    faqs: normalizeFaqsSection(city?.content?.faqs || {}, city),
    modules: normalizeModulesSection(city?.content?.modules || {}, city),
  };
};

const buildSeoPayload = ({ city, sections, attractionDocs }) => {
  const bannerImage = sections.banner.banners[0]?.url;
  const attractionImage = attractionDocs.find((item) => asArray(item.media).length > 0)?.media?.[0]?.url;
  const defaultCityImage = city?.coverImage?.url || city?.image?.url || city?.thumbnailImage?.url || '';

  const ogImage = bannerImage || attractionImage || defaultCityImage || '';
  const title =
    asString(city?.seoConfig?.metaTitle) ||
    `${sections.banner.cityName || city?.name || 'City'} | Together In India`;
  const description =
    asString(city?.seoConfig?.metaDescription) ||
    sections.introduction.mainContent ||
    city?.shortDescription ||
    city?.description ||
    `Discover ${sections.banner.cityName || city?.name || 'this city'} with Together In India.`;

  const keywords =
    asArray(city?.seoConfig?.keywords).filter(Boolean).length > 0
      ? asArray(city?.seoConfig?.keywords).filter(Boolean)
      : [sections.banner.cityName || city?.name, sections.banner.famousFor, city?.state, city?.country]
          .map((item) => asString(item))
          .filter(Boolean);

  return {
    title,
    description,
    canonical: `/city/${city?.slug}`,
    ogImage,
    keywords,
  };
};

const buildPublicCityResponse = async (city) => {
  const sections = buildCanonicalFromCity(city);
  const attractionIds = [...new Set([...sections.attractions.attractionIds, ...sections.attractions.featuredAttractions])];

  const attractionDocs = attractionIds.length
    ? await Attraction.find({
        _id: { $in: attractionIds },
        isDeleted: false,
        status: 'published',
      })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const attractionMap = new Map(attractionDocs.map((doc) => [String(doc._id), doc]));
  const orderedAttractions = sections.attractions.attractionIds
    .map((id) => attractionMap.get(String(id)))
    .filter(Boolean);

  const featuredAttractions = sections.attractions.featuredAttractions
    .map((id) => attractionMap.get(String(id)))
    .filter(Boolean);

  const seo = buildSeoPayload({ city, sections, attractionDocs });
  const sectionFlags = buildSectionFlags(sections);

  const dynamicModules = {
    hotels: sections.modules.hotels,
    tours: sections.modules.tours,
    restaurants: sections.modules.restaurants,
    shopping: sections.modules.shopping,
  };

  const basicInfo = {
    id: city._id,
    cityName: sections.banner.cityName || city.name,
    slug: city.slug,
    tier: sections.banner.tier,
    popularName: sections.banner.popularName,
    famousFor: sections.banner.famousFor,
    direction: sections.banner.direction,
    continent: sections.banner.continent,
    state: city.stateId || city.state,
    country: city.countryId || city.country,
    banners: sections.banner.banners,
    sectionFlags,
  };

  return {
    basicInfo,
    storyTimeline: sections.story,
    introduction: sections.introduction,
    fraudSection: sections.fraud,
    attractions: {
      items: orderedAttractions,
      featuredItems: featuredAttractions,
      attractionIds: sections.attractions.attractionIds,
    },
    visitorExperiences: sections.experiences,
    throughTheLenses: sections.gallery,
    faqs: sections.faqs,
    dynamicModules,
    seo,
    renderBlocks: {
      hero: basicInfo,
      story: sections.story,
      intro: sections.introduction,
      fraud: sections.fraud,
      attractions: {
        items: orderedAttractions,
        featuredItems: featuredAttractions,
      },
      experiences: sections.experiences,
      gallery: sections.gallery,
      faq: sections.faqs,
      modules: dynamicModules,
    },
  };
};

const getAllCities = async (query = {}) => {
  const cacheKey = `cities:all:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === 'true';
  if (query.countryId) filter.countryId = query.countryId;
  if (query.stateId) filter.stateId = query.stateId;
  if (query.state) filter.state = { $regex: query.state, $options: 'i' };
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const sort = buildSortQuery(query.sortBy || 'order', query.sortOrder || 'asc');
  const [cities, total] = await Promise.all([
    City.find(filter)
      .populate('countryId', 'name slug')
      .populate('stateId', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(perPage)
      .lean(),
    City.countDocuments(filter),
  ]);

  const result = { cities, pagination: buildPaginationMeta(page, perPage, total) };
  await cache.set(cacheKey, result, 1800);
  return result;
};

const getCityBySlug = async (slug) => {
  const city = await City.findOne({ slug, isDeleted: false })
    .populate('countryId', 'name slug')
    .populate('stateId', 'name slug')
    .populate('cmsOverrides.pageId', 'slug type')
    .lean();
  if (!city) throw ApiError.notFound('City not found');
  return city;
};

const getCityById = async (id) => {
  const city = await City.findOne({ _id: id, isDeleted: false })
    .populate('countryId', 'name slug')
    .populate('stateId', 'name slug')
    .populate('cmsOverrides.pageId', 'slug type')
    .lean();
  if (!city) throw ApiError.notFound('City not found');
  return city;
};

const getCityByIdentifier = async (identifier) => {
  if (objectIdRegex.test(identifier)) return getCityById(identifier);
  return getCityBySlug(identifier);
};

const createCity = async (data) => {
  data.slug = data.slug || (await generateUniqueSlug(data.name, City));
  const city = await City.create(data);
  await cache.delPattern('cities:*');
  return city;
};

const updateCity = async (id, data) => {
  if (data.name && !data.slug) data.slug = await generateUniqueSlug(data.name, City, 'slug', id);
  const city = await City.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
  if (!city) throw ApiError.notFound('City not found');
  await cache.delPattern('cities:*');
  return city;
};

const updateCitySection = async (id, section, payload) => {
  const city = await City.findOne({ _id: id, isDeleted: false });
  if (!city) throw ApiError.notFound('City not found');

  const { key, data } = normalizeSectionPayload(section, payload, city);
  const cleaned = compactObject({ ...DEFAULT_SECTIONS[key], ...data });

  city.content = city.content || {};
  city.content[key] = { ...DEFAULT_SECTIONS[key], ...cleaned };

  if (key === 'gallery') {
    city.content.throughTheLenses = city.content[key];
  }

  // `content` is a Mixed field; nested mutations are not reliably tracked unless marked.
  city.markModified('content');

  if (key === 'banner') {
    city.name = city.content.banner.cityName || city.name;
    if (city.content.banner.slug) {
      const desired = slugify(city.content.banner.slug);
      city.slug = desired ? await generateUniqueSlug(desired, City, 'slug', city._id) : city.slug;
    }
    if (city.content.banner.stateId) city.stateId = city.content.banner.stateId;
    if (city.content.banner.countryId) city.countryId = city.content.banner.countryId;
  }

  await city.save();
  await cache.delPattern('cities:*');
  return city;
};

const deleteCity = async (id) => {
  const city = await City.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true, isActive: false }, { new: true });
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

const getPublicCityBySlug = async (slug) => {
  const cacheKey = `cities:public:${slug}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const city = await City.findOne({ slug, isDeleted: false, isActive: true })
    .populate('countryId', 'name slug')
    .populate('stateId', 'name slug')
    .lean();

  if (!city) throw ApiError.notFound('City not found');

  const response = await buildPublicCityResponse(city);
  await cache.set(cacheKey, response, 900);
  return response;
};

export {
  SECTION_ALIAS_TO_KEY,
  DEFAULT_SECTIONS,
  canonicalSectionKey,
  normalizeSectionPayload,
  buildCanonicalFromCity,
  buildPublicCityResponse,
  getAllCities,
  getCityBySlug,
  getCityById,
  getCityByIdentifier,
  createCity,
  updateCity,
  updateCitySection,
  deleteCity,
  getFeaturedCities,
  getPublicCityBySlug,
};
