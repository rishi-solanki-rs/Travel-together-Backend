import express from 'express';
import ListingBase from '../../shared/models/ListingBase.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { LISTING_STATUS } from '../../shared/constants/index.js';

const router = express.Router();

const search = asyncHandler(async (req, res) => {
  const { q, category, cityId, subtypeId, minPrice, maxPrice, sortBy, sortOrder, isFeatured } = req.query;
  const { page, perPage, skip } = parsePaginationQuery(req.query);

  const filter = { isDeleted: false, isActive: true, status: LISTING_STATUS.PUBLISHED };

  if (q) {
    filter.$text = { $search: q };
  }

  if (category) filter.category = category;
  if (cityId) filter.cityId = cityId;
  if (subtypeId) filter.subtypeId = subtypeId;
  if (isFeatured === 'true') filter.isFeatured = true;

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
      .select('title slug coverImage pricing category subtypeId cityId isFeatured isPremium stats tags')
      .populate('cityId', 'name state')
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

router.get('/', search);
router.get('/suggest', suggest);

export default router;
