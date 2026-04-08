import Country from '../../shared/models/Country.model.js';
import State from '../../shared/models/State.model.js';
import City from '../../shared/models/City.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { generateUniqueSlug } from '../../utils/slugify.js';

const listCountries = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const [items, total] = await Promise.all([
    Country.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Country.countDocuments(filter),
  ]);

  const itemsWithCounts = await Promise.all(
    items.map(async (item) => {
      const [states, cities] = await Promise.all([
        State.countDocuments({ countryId: item._id, isDeleted: false }),
        City.countDocuments({ countryId: item._id, isDeleted: false }),
      ]);
      return { ...item, statesCount: states, citiesCount: cities };
    })
  );

  return { items: itemsWithCounts, pagination: buildPaginationMeta(page, perPage, total) };
};

const getCountryById = async (id) => {
  const country = await Country.findOne({ _id: id, isDeleted: false }).lean();
  if (!country) throw ApiError.notFound('Country not found');
  return country;
};

const createCountry = async (payload, actorId = null) => {
  const slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.name, Country);
  return Country.create({
    name: payload.name,
    slug,
    status: payload.status || 'draft',
    createdBy: actorId,
    updatedBy: actorId,
  });
};

const updateCountry = async (id, payload, actorId = null) => {
  const country = await Country.findOne({ _id: id, isDeleted: false });
  if (!country) throw ApiError.notFound('Country not found');

  if (payload.name && payload.name !== country.name) {
    country.name = payload.name;
    country.slug = payload.slug ? payload.slug.toLowerCase() : await generateUniqueSlug(payload.name, Country, 'slug', id);
  } else if (payload.slug) {
    country.slug = payload.slug.toLowerCase();
  }

  if (payload.status) country.status = payload.status;
  country.updatedBy = actorId;
  await country.save();
  return country;
};

const updateCountrySection = async (id, section, payload, actorId = null) => {
  const country = await Country.findOne({ _id: id, isDeleted: false });
  if (!country) throw ApiError.notFound('Country not found');

  country.content = country.content || {};
  country.content[section] = payload;
  country.updatedBy = actorId;
  await country.save();
  return country;
};

const deleteCountry = async (id, actorId = null) => {
  const country = await Country.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, status: 'unpublished', updatedBy: actorId },
    { new: true }
  );
  if (!country) throw ApiError.notFound('Country not found');
  return country;
};

export { listCountries, getCountryById, createCountry, updateCountry, updateCountrySection, deleteCountry };
