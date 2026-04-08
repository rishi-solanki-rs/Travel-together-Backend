import ListingBase from '../../shared/models/ListingBase.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';
import { LISTING_STATUS, PLAN_PRIORITY } from '../../shared/constants/index.js';

const normalizeDiscoveryPayload = (data = {}) => {
  const payload = { ...data };

  if (payload.subCategoryId && !payload.subtypeId) payload.subtypeId = payload.subCategoryId;
  if (Array.isArray(payload.subCategoryIds) && !payload.subCategoryIds.length && payload.subtypeId) {
    payload.subCategoryIds = [payload.subtypeId];
  }
  if (!Array.isArray(payload.subCategoryIds) && payload.subtypeId) {
    payload.subCategoryIds = [payload.subtypeId];
  }
  if (!Array.isArray(payload.categoryIds) && payload.categoryId) {
    payload.categoryIds = [payload.categoryId];
  }
  if (Array.isArray(payload.nearbyLandmarks)) {
    payload.nearbyLandmarks = payload.nearbyLandmarks
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean);
  }
  if (Array.isArray(payload.tags)) {
    payload.tags = payload.tags.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  }

  return payload;
};

const createListing = async (vendorId, data) => {
  const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const slug = await generateUniqueSlug(data.title, ListingBase);
  const normalized = normalizeDiscoveryPayload(data);
  const listing = await ListingBase.create({
    ...normalized,
    vendorId,
    slug,
    category: vendor.category,
    cityId: normalized.cityId || vendor.cityId,
    planPriority: PLAN_PRIORITY[vendor.currentPlan] || 0,
  });

  await Vendor.findByIdAndUpdate(vendorId, { $inc: { 'stats.totalListings': 1 } });
  return listing;
};

const getListingBySlug = async (slug) => {
  const listing = await ListingBase.findOne({ slug, isDeleted: false })
    .populate('vendorId', 'businessName slug contactInfo logo address socialLinks')
    .populate('categoryId', 'name key')
    .populate('subtypeId', 'name key')
    .populate('cityId', 'name state')
    .populate('areaId', 'name zoneType nearbyLandmarks');
  if (!listing) throw ApiError.notFound('Listing not found');

  await ListingBase.findByIdAndUpdate(listing._id, { $inc: { 'stats.views': 1 } });
  return listing;
};

const getListingById = async (id) => {
  const listing = await ListingBase.findOne({ _id: id, isDeleted: false })
    .populate('vendorId', 'businessName slug')
    .populate('categoryId', 'name key')
    .populate('subtypeId', 'name key')
    .populate('cityId', 'name state')
    .populate('areaId', 'name zoneType nearbyLandmarks');
  if (!listing) throw ApiError.notFound('Listing not found');
  return listing;
};

const getVendorListings = async (vendorId, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { vendorId, isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.areaId) filter.areaId = query.areaId;
  if (query.categoryId) filter.categoryIds = query.categoryId;
  if (query.subCategoryId) filter.subCategoryIds = query.subCategoryId;
  if (query.vendorType) filter.vendorType = query.vendorType;
  if (query.discoveryType) filter.discoveryType = query.discoveryType;

  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');
  const [listings, total] = await Promise.all([
    ListingBase.find(filter).sort(sort).skip(skip).limit(perPage)
      .populate('categoryId', 'name').populate('subtypeId', 'name').populate('cityId', 'name').populate('areaId', 'name zoneType'),
    ListingBase.countDocuments(filter),
  ]);

  return { listings, pagination: buildPaginationMeta(page, perPage, total) };
};

const updateListing = async (id, vendorId, data) => {
  const listing = await ListingBase.findOne({ _id: id, vendorId, isDeleted: false });
  if (!listing) throw ApiError.notFound('Listing not found or unauthorized');

  const normalized = normalizeDiscoveryPayload(data);

  if (normalized.title && normalized.title !== listing.title) {
    normalized.slug = await generateUniqueSlug(normalized.title, ListingBase, 'slug', id);
  }

  if (listing.status !== LISTING_STATUS.DRAFT && normalized.status !== listing.status) {
    normalized.status = LISTING_STATUS.PENDING_REVIEW;
  }

  return ListingBase.findByIdAndUpdate(id, { ...normalized, $inc: { version: 1 } }, { new: true, runValidators: true });
};

const submitForReview = async (id, vendorId) => {
  const listing = await ListingBase.findOne({ _id: id, vendorId, isDeleted: false });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.status !== LISTING_STATUS.DRAFT) throw ApiError.badRequest('Only draft listings can be submitted for review');

  return ListingBase.findByIdAndUpdate(id, { status: LISTING_STATUS.PENDING_REVIEW }, { new: true });
};

const publishListing = async (id, adminId) => {
  const listing = await ListingBase.findById(id);
  if (!listing) throw ApiError.notFound('Listing not found');

  return ListingBase.findByIdAndUpdate(id, {
    status: LISTING_STATUS.PUBLISHED,
    isActive: true,
    publishedAt: new Date(),
    publishedBy: adminId,
  }, { new: true });
};

const unpublishListing = async (id, adminId, notes) => {
  return ListingBase.findByIdAndUpdate(id, {
    status: LISTING_STATUS.UNPUBLISHED,
    isActive: false,
    reviewedBy: adminId,
    reviewedAt: new Date(),
    reviewNotes: notes,
  }, { new: true });
};

const getAllListings = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.areaId) filter.areaId = query.areaId;
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.isFeatured) filter.isFeatured = query.isFeatured === 'true';
  if (query.subCategoryId) filter.subCategoryIds = query.subCategoryId;
  if (query.categoryId) filter.categoryIds = query.categoryId;
  if (query.vendorType) filter.vendorType = query.vendorType;
  if (query.discoveryType) filter.discoveryType = query.discoveryType;

  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');
  const [listings, total] = await Promise.all([
    ListingBase.find(filter).sort(sort).skip(skip).limit(perPage)
      .populate('vendorId', 'businessName').populate('categoryId', 'name').populate('cityId', 'name').populate('areaId', 'name zoneType'),
    ListingBase.countDocuments(filter),
  ]);

  return { listings, pagination: buildPaginationMeta(page, perPage, total) };
};

const softDeleteListing = async (id, vendorId) => {
  const filter = { _id: id, isDeleted: false };
  if (vendorId) filter.vendorId = vendorId;
  const listing = await ListingBase.findOneAndUpdate(filter, { isDeleted: true, isActive: false, status: LISTING_STATUS.ARCHIVED, archivedAt: new Date() });
  if (!listing) throw ApiError.notFound('Listing not found');
};

export default {
  createListing, getListingBySlug, getListingById, getVendorListings,
  updateListing, submitForReview, publishListing, unpublishListing,
  getAllListings, softDeleteListing,
};
