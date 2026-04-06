import ListingBase from '../../shared/models/ListingBase.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta, buildSortQuery } from '../../utils/pagination.js';
import { LISTING_STATUS, PLAN_PRIORITY } from '../../shared/constants/index.js';

const createListing = async (vendorId, data) => {
  const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const slug = await generateUniqueSlug(data.title, ListingBase);
  const listing = await ListingBase.create({
    ...data,
    vendorId,
    slug,
    category: vendor.category,
    cityId: data.cityId || vendor.cityId,
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
    .populate('cityId', 'name state');
  if (!listing) throw ApiError.notFound('Listing not found');

  await ListingBase.findByIdAndUpdate(listing._id, { $inc: { 'stats.views': 1 } });
  return listing;
};

const getListingById = async (id) => {
  const listing = await ListingBase.findOne({ _id: id, isDeleted: false })
    .populate('vendorId', 'businessName slug')
    .populate('categoryId', 'name key')
    .populate('subtypeId', 'name key')
    .populate('cityId', 'name state');
  if (!listing) throw ApiError.notFound('Listing not found');
  return listing;
};

const getVendorListings = async (vendorId, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { vendorId, isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');
  const [listings, total] = await Promise.all([
    ListingBase.find(filter).sort(sort).skip(skip).limit(perPage)
      .populate('categoryId', 'name').populate('subtypeId', 'name').populate('cityId', 'name'),
    ListingBase.countDocuments(filter),
  ]);

  return { listings, pagination: buildPaginationMeta(page, perPage, total) };
};

const updateListing = async (id, vendorId, data) => {
  const listing = await ListingBase.findOne({ _id: id, vendorId, isDeleted: false });
  if (!listing) throw ApiError.notFound('Listing not found or unauthorized');

  if (data.title && data.title !== listing.title) {
    data.slug = await generateUniqueSlug(data.title, ListingBase, 'slug', id);
  }

  if (listing.status !== LISTING_STATUS.DRAFT && data.status !== listing.status) {
    data.status = LISTING_STATUS.PENDING_REVIEW;
  }

  return ListingBase.findByIdAndUpdate(id, { ...data, $inc: { version: 1 } }, { new: true, runValidators: true });
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
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.isFeatured) filter.isFeatured = query.isFeatured === 'true';

  const sort = buildSortQuery(query.sortBy || 'createdAt', query.sortOrder || 'desc');
  const [listings, total] = await Promise.all([
    ListingBase.find(filter).sort(sort).skip(skip).limit(perPage)
      .populate('vendorId', 'businessName').populate('categoryId', 'name').populate('cityId', 'name'),
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
