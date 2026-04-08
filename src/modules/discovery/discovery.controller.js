import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import Category from '../../shared/models/Category.model.js';
import SubType from '../../shared/models/SubType.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import {
  findNearbyByCityAndArea,
  getRelatedPlaces,
  getSmartDiscoveryBlocks,
} from '../../operations/discovery/nearby.service.js';

const getNearby = asyncHandler(async (req, res) => {
  const data = await findNearbyByCityAndArea(req.query);
  ApiResponse.success(res, 'Nearby places fetched', data);
});

const getRelated = asyncHandler(async (req, res) => {
  const data = await getRelatedPlaces({ listingId: req.params.listingId, limit: req.query.limit || 12 });
  ApiResponse.success(res, 'Related places fetched', data);
});

const getBlocks = asyncHandler(async (req, res) => {
  const data = await getSmartDiscoveryBlocks(req.query);
  ApiResponse.success(res, 'Smart discovery blocks fetched', data);
});

const getSidebarFilters = asyncHandler(async (req, res) => {
  const domains = {
    eatDrink: ['restaurants'],
    shops: ['shops', 'tribes'],
    fashion: ['shops'],
    nearby: ['hotels', 'restaurants', 'shops', 'tribes', 'thingsToDo', 'destinations'],
  };
  const categories = domains[req.query.domain] || domains.nearby;

  const categoryDocs = await Category.find({ key: { $in: categories }, isDeleted: false, isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();
  const categoryIds = categoryDocs.map((item) => item._id);

  const subtypes = await SubType.find({ categoryId: { $in: categoryIds }, isDeleted: false, isActive: true })
    .sort({ order: 1, name: 1 })
    .select('name key categoryId searchFilters')
    .lean();

  const tags = await ListingBase.aggregate([
    {
      $match: {
        isDeleted: false,
        isActive: true,
        status: 'published',
        category: { $in: categories },
        ...(req.query.cityId ? { cityId: req.query.cityId } : {}),
      },
    },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  const filterPresets = {
    eatDrink: {
      cuisineAndType: [
        'dishes',
        'veg',
        'non veg',
        'north indian',
        'south indian',
        'mughlai',
        'street food',
        'restaurant',
        'cafes',
        'bars & pubs',
        'bakeries',
        'restaurant in hotels',
      ],
      labels: ['chains', 'super saver deals', 'popular choice', 'sponsored', 'nearby open now'],
    },
    shops: {
      storeType: ['commercial outlet', 'malls', 'markets', 'artisan store', 'NGO', 'boutiques'],
      productStyle: [
        'sarees',
        'jewellery',
        'bags',
        'handicrafts',
        'wooden toys',
        'wall hanging',
        'handloom',
        'tribal products',
      ],
      labels: ['premium brands', 'local markets', 'seasonal sale', 'just in', 'iconic collections'],
    },
  };

  const activePreset = req.query.domain === 'eatDrink' ? filterPresets.eatDrink : filterPresets.shops;

  ApiResponse.success(res, 'Sidebar filter metadata fetched', {
    categories: categoryDocs,
    subcategories: subtypes,
    tags: tags.map((t) => ({ value: t._id, count: t.count })),
    presets: activePreset,
  });
});

export { getNearby, getRelated, getBlocks, getSidebarFilters };
