import express from 'express';
import ListingBase from '../../shared/models/ListingBase.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { LISTING_STATUS } from '../../shared/constants/index.js';

const router = express.Router();

const search = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    cityId,
    areaId,
    subtypeId,
    subCategoryId,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    isFeatured,
    vendorType,
    discoveryType,
    tag,
    landmark,
    openNow,
  } = req.query;
  const { page, perPage, skip } = parsePaginationQuery(req.query);

  const filter = { isDeleted: false, isActive: true, status: LISTING_STATUS.PUBLISHED };

  if (q) {
    filter.$text = { $search: q };
  }

  if (category) filter.category = category;
  if (cityId) filter.cityId = cityId;
  if (areaId) filter.areaId = areaId;
  if (subtypeId) filter.subtypeId = subtypeId;
  if (subCategoryId) filter.subCategoryIds = subCategoryId;
  if (isFeatured === 'true') filter.isFeatured = true;
  if (vendorType) filter.vendorType = vendorType;
  if (discoveryType) filter.discoveryType = discoveryType;
  if (openNow === 'true') filter['labels.openNow'] = true;

  if (tag) {
    const tags = String(tag).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }

  if (landmark) {
    const landmarks = String(landmark).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (landmarks.length) filter.nearbyLandmarks = { $in: landmarks };
  }

  if (minPrice || maxPrice) {
    filter['pricing.basePrice'] = {};
    if (minPrice) filter['pricing.basePrice'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.basePrice'].$lte = Number(maxPrice);
  }

  let sort = { planPriority: -1 };
  if (q) sort = { score: { $meta: 'textScore' }, ...sort };
  if (sortBy === 'price_asc') sort = { 'pricing.basePrice': 1 };
  if (sortBy === 'price_desc') sort = { 'pricing.basePrice': -1 };
  if (sortBy === 'newest') sort = { createdAt: -1 };
  if (sortBy === 'popular') sort = { 'stats.views': -1 };

  const projection = q ? { score: { $meta: 'textScore' } } : {};

  const [listings, total] = await Promise.all([
    ListingBase.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(perPage)
      .select('title slug coverImage pricing category subtypeId cityId areaId vendorId isFeatured isPremium stats tags vendorType discoveryType labels nearbyLandmarks')
      .populate('cityId', 'name state')
      .populate('areaId', 'name zoneType')
      .populate('subtypeId', 'name')
      .lean(),
    ListingBase.countDocuments(filter),
  ]);

  ApiResponse.paginated(res, 'Search results', listings, buildPaginationMeta(page, perPage, total));
});

const suggest = asyncHandler(async (req, res) => {
  const { q, limit = 5 } = req.query;
  if (!q || q.length < 2) return ApiResponse.success(res, 'Suggestions', []);

  const suggestions = await ListingBase.find(
    { $text: { $search: q }, isDeleted: false, isActive: true, status: LISTING_STATUS.PUBLISHED },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit))
    .select('title slug category')
    .lean();

  ApiResponse.success(res, 'Suggestions', suggestions);
});

const blended = asyncHandler(async (req, res) => {
  const { q = '', cityId, areaId, limit = 24 } = req.query;
  const normalizedLimit = Math.max(6, Math.min(Number(limit) || 24, 100));

  const filter = {
    isDeleted: false,
    isActive: true,
    status: LISTING_STATUS.PUBLISHED,
    ...(cityId ? { cityId } : {}),
    ...(areaId ? { areaId } : {}),
    ...(q ? { $text: { $search: q } } : {}),
  };

  const projection = q ? { score: { $meta: 'textScore' } } : {};

  const rows = await ListingBase.find(filter, projection)
    .sort(q ? { score: { $meta: 'textScore' }, planPriority: -1, 'stats.views': -1 } : { planPriority: -1, 'stats.views': -1 })
    .limit(normalizedLimit)
    .select('title slug coverImage category cityId areaId vendorId pricing labels vendorType discoveryType tags')
    .lean();

  const grouped = rows.reduce((acc, row) => {
    const key = row.category || 'others';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  ApiResponse.success(res, 'Blended discovery search results', {
    total: rows.length,
    grouped,
    items: rows,
  });
});

router.get('/', search);
router.get('/suggest', suggest);
router.get('/blended', blended);

export default router;
