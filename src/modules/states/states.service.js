import State from '../../shared/models/State.model.js';
import Country from '../../shared/models/Country.model.js';
import City from '../../shared/models/City.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { generateUniqueSlug } from '../../utils/slugify.js';

const ensureCountryExists = async (countryId) => {
  const country = await Country.findOne({ _id: countryId, isDeleted: false }).lean();
  if (!country) throw ApiError.notFound('Country not found');
};

const listStates = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.countryId) filter.countryId = query.countryId;
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const [items, total] = await Promise.all([
    State.find(filter)
      .populate('countryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    State.countDocuments(filter),
  ]);

  const itemsWithCounts = await Promise.all(
    items.map(async (item) => {
      const cities = await City.countDocuments({ stateId: item._id, isDeleted: false });
      return { ...item, citiesCount: cities };
    })
  );

  return { items: itemsWithCounts, pagination: buildPaginationMeta(page, perPage, total) };
};

const getStateById = async (id) => {
  const state = await State.findOne({ _id: id, isDeleted: false }).populate('countryId', 'name slug').lean();
  if (!state) throw ApiError.notFound('State not found');
  return state;
};

const createState = async (payload, actorId = null) => {
  const normalizedCountryId = payload.countryId || payload.country;
  if (!normalizedCountryId) throw ApiError.badRequest('countryId is required');
  await ensureCountryExists(normalizedCountryId);
  const slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.name, State);
  return State.create({
    countryId: normalizedCountryId,
    name: payload.name,
    slug,
    status: payload.status || 'draft',
    createdBy: actorId,
    updatedBy: actorId,
  });
};

const updateState = async (id, payload, actorId = null) => {
  const state = await State.findOne({ _id: id, isDeleted: false });
  if (!state) throw ApiError.notFound('State not found');

  const normalizedCountryId = payload.countryId || payload.country;
  if (normalizedCountryId && String(normalizedCountryId) !== String(state.countryId)) {
    await ensureCountryExists(normalizedCountryId);
    state.countryId = normalizedCountryId;
  }

  if (payload.name && payload.name !== state.name) {
    state.name = payload.name;
    state.slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.name, State, 'slug', id);
  } else if (payload.slug) {
    state.slug = payload.slug.toLowerCase();
  }

  if (payload.status) state.status = payload.status;
  state.updatedBy = actorId;
  await state.save();
  return state;
};

const updateStateSection = async (id, section, payload, actorId = null) => {
  const state = await State.findOne({ _id: id, isDeleted: false });
  if (!state) throw ApiError.notFound('State not found');

  state.content = state.content || {};
  state.content[section] = payload;
  state.updatedBy = actorId;
  await state.save();
  return state;
};

const deleteState = async (id, actorId = null) => {
  const state = await State.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, status: 'unpublished', updatedBy: actorId },
    { new: true }
  );
  if (!state) throw ApiError.notFound('State not found');
  return state;
};

export { listStates, getStateById, createState, updateState, updateStateSection, deleteState };
