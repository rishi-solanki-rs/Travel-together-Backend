import Attraction from '../../shared/models/Attraction.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { generateUniqueSlug } from '../../utils/slugify.js';

const listAttractions = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.cityId) filter.cityId = query.cityId;
  if (query.stateId) filter.stateId = query.stateId;
  if (query.countryId) filter.countryId = query.countryId;
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.search) filter.title = { $regex: query.search, $options: 'i' };

  const [items, total] = await Promise.all([
    Attraction.find(filter)
      .populate('cityId', 'name slug')
      .populate('stateId', 'name slug')
      .populate('countryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Attraction.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(page, perPage, total) };
};

const getAttractionById = async (id) => {
  const attraction = await Attraction.findOne({ _id: id, isDeleted: false })
    .populate('cityId', 'name slug')
    .populate('stateId', 'name slug')
    .populate('countryId', 'name slug')
    .lean();
  if (!attraction) throw ApiError.notFound('Attraction not found');
  return attraction;
};

const createAttraction = async (payload, actorId = null) => {
  const slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.title, Attraction);
  return Attraction.create({
    ...payload,
    slug,
    status: payload.status || 'draft',
    createdBy: actorId,
    updatedBy: actorId,
  });
};

const updateAttraction = async (id, payload, actorId = null) => {
  const attraction = await Attraction.findOne({ _id: id, isDeleted: false });
  if (!attraction) throw ApiError.notFound('Attraction not found');

  if (payload.title && payload.title !== attraction.title) {
    attraction.title = payload.title;
    attraction.slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.title, Attraction, 'slug', id);
  } else if (payload.slug) {
    attraction.slug = payload.slug.toLowerCase();
  }

  const mutableFields = ['category', 'summary', 'cityId', 'stateId', 'countryId', 'media', 'status'];
  for (const field of mutableFields) {
    if (payload[field] !== undefined) attraction[field] = payload[field];
  }

  attraction.updatedBy = actorId;
  await attraction.save();
  return attraction;
};

const deleteAttraction = async (id, actorId = null) => {
  const attraction = await Attraction.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, status: 'unpublished', updatedBy: actorId },
    { new: true }
  );
  if (!attraction) throw ApiError.notFound('Attraction not found');
  return attraction;
};

export { listAttractions, getAttractionById, createAttraction, updateAttraction, deleteAttraction };
