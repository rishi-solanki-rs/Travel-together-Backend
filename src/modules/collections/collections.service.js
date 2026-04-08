import Collection from '../../shared/models/Collection.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const buildCollectionFilter = ({ query = {}, vendorScope = null }) => {
  const filter = { isDeleted: false };
  if (vendorScope) filter.vendorId = vendorScope;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.areaId) filter.areaId = query.areaId;
  if (query.season) filter.season = query.season;
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.featuredOnly) filter.isFeatured = true;
  if (query.tag) filter.tags = { $in: [String(query.tag).toLowerCase()] };
  if (!vendorScope) filter.isActive = true;
  return filter;
};

const createCollection = async ({ payload, user }) => {
  const slug = await generateUniqueSlug(payload.title, Collection);
  return Collection.create({
    ...payload,
    slug,
    vendorId: user.vendorId,
    createdBy: user.id,
    tags: (payload.tags || []).map((tag) => String(tag).toLowerCase()),
  });
};

const updateCollection = async ({ id, payload, user }) => {
  const row = await Collection.findOne({ _id: id, vendorId: user.vendorId, isDeleted: false });
  if (!row) throw ApiError.notFound('Collection not found');

  if (payload.title && payload.title !== row.title) {
    row.slug = await generateUniqueSlug(payload.title, Collection, 'slug', row._id);
    row.title = payload.title;
  }

  Object.keys(payload).forEach((key) => {
    if (key === 'title') return;
    row[key] = payload[key];
  });

  if (payload.tags) row.tags = payload.tags.map((tag) => String(tag).toLowerCase());
  await row.save();
  return row;
};

const reorderCollectionItems = async ({ id, listingIds, user }) => {
  const row = await Collection.findOne({ _id: id, vendorId: user.vendorId, isDeleted: false });
  if (!row) throw ApiError.notFound('Collection not found');
  row.listingIds = listingIds;
  await row.save();
  return row;
};

const removeCollection = async ({ id, user }) => {
  const row = await Collection.findOneAndUpdate(
    { _id: id, vendorId: user.vendorId, isDeleted: false },
    { isDeleted: true, isActive: false },
    { new: true }
  );
  if (!row) throw ApiError.notFound('Collection not found');
  return row;
};

const getCollections = async ({ query = {}, vendorScope = null }) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = buildCollectionFilter({ query, vendorScope });

  const [items, total] = await Promise.all([
    Collection.find(filter)
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('cityId', 'name slug')
      .populate('areaId', 'name slug')
      .populate('vendorId', 'businessName slug')
      .populate('listingIds', 'title slug category coverImage'),
    Collection.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(page, perPage, total) };
};

const getCollectionById = async ({ id, vendorScope = null }) => {
  const filter = { _id: id, isDeleted: false };
  if (vendorScope) filter.vendorId = vendorScope;
  else filter.isActive = true;

  const row = await Collection.findOne(filter)
    .populate('cityId', 'name slug')
    .populate('areaId', 'name slug')
    .populate('vendorId', 'businessName slug')
    .populate('listingIds', 'title slug category coverImage pricing labels');

  if (!row) throw ApiError.notFound('Collection not found');
  return row;
};

const summarizeCollectionsBySeason = (rows = []) => {
  return rows.reduce((acc, row) => {
    const key = row.season || 'all';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
};

export {
  buildCollectionFilter,
  createCollection,
  updateCollection,
  reorderCollectionItems,
  removeCollection,
  getCollections,
  getCollectionById,
  summarizeCollectionsBySeason,
};
