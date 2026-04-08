import EditorialBlock from '../../shared/models/EditorialBlock.model.js';
import ApiError from '../../utils/ApiError.js';
import { generateUniqueSlug } from '../../utils/slugify.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const isEditorialLive = ({ startsAt, endsAt, now = new Date() }) => {
  if (startsAt && new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
};

const buildEditorialFilter = ({ query = {}, publicOnly = true }) => {
  const filter = { isDeleted: false };
  if (query.cityId) filter.cityId = query.cityId;
  if (query.areaId) filter.areaId = query.areaId;
  if (query.season) filter.season = query.season;
  if (query.widgetType) filter.widgetType = query.widgetType;
  if (query.tag) filter.tags = { $in: [String(query.tag).toLowerCase()] };

  if (publicOnly) {
    filter.isActive = true;
    filter.$or = [
      { startsAt: null },
      { startsAt: { $lte: new Date() } },
    ];
    filter.$and = [
      {
        $or: [
          { endsAt: null },
          { endsAt: { $gte: new Date() } },
        ],
      },
    ];
  }

  return filter;
};

const createEditorial = async (payload) => {
  const slug = await generateUniqueSlug(payload.title, EditorialBlock);
  return EditorialBlock.create({
    ...payload,
    slug,
    tags: (payload.tags || []).map((tag) => String(tag).toLowerCase()),
  });
};

const updateEditorial = async ({ id, payload }) => {
  const row = await EditorialBlock.findOne({ _id: id, isDeleted: false });
  if (!row) throw ApiError.notFound('Editorial block not found');

  if (payload.title && payload.title !== row.title) {
    row.slug = await generateUniqueSlug(payload.title, EditorialBlock, 'slug', row._id);
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

const removeEditorial = async (id) => {
  const row = await EditorialBlock.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true, isActive: false }, { new: true });
  if (!row) throw ApiError.notFound('Editorial block not found');
  return row;
};

const listEditorial = async ({ query = {}, publicOnly = true }) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = buildEditorialFilter({ query, publicOnly });

  const [items, total] = await Promise.all([
    EditorialBlock.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('cityId', 'name slug')
      .populate('areaId', 'name slug')
      .populate('listingIds', 'title slug category coverImage'),
    EditorialBlock.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(page, perPage, total) };
};

const getEditorialById = async ({ id, publicOnly = true }) => {
  const filter = { _id: id, isDeleted: false };
  if (publicOnly) filter.isActive = true;

  const row = await EditorialBlock.findOne(filter)
    .populate('cityId', 'name slug')
    .populate('areaId', 'name slug')
    .populate('listingIds', 'title slug category coverImage pricing');

  if (!row) throw ApiError.notFound('Editorial block not found');
  if (publicOnly && !isEditorialLive({ startsAt: row.startsAt, endsAt: row.endsAt })) {
    throw ApiError.notFound('Editorial block not found');
  }
  return row;
};

const countSeasonalEditorialBlocks = (rows = []) => rows.filter((row) => row.season && row.season !== 'all').length;

export {
  isEditorialLive,
  buildEditorialFilter,
  createEditorial,
  updateEditorial,
  removeEditorial,
  listEditorial,
  getEditorialById,
  countSeasonalEditorialBlocks,
};
