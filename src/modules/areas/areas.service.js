import Area from '../../shared/models/Area.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const getAreas = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { isDeleted: false };

  if (query.cityId) filter.cityId = query.cityId;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.zoneType) filter.zoneType = query.zoneType;

  const [items, total] = await Promise.all([
    Area.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(perPage).lean(),
    Area.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(page, perPage, total) };
};

const getAreaById = async (id) => {
  const area = await Area.findOne({ _id: id, isDeleted: false }).lean();
  if (!area) throw ApiError.notFound('Area not found');
  return area;
};

const createArea = async (payload) => Area.create(payload);

const updateArea = async (id, payload) => {
  const area = await Area.findOneAndUpdate({ _id: id, isDeleted: false }, payload, { new: true });
  if (!area) throw ApiError.notFound('Area not found');
  return area;
};

const removeArea = async (id) => {
  const area = await Area.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, isActive: false },
    { new: true }
  );
  if (!area) throw ApiError.notFound('Area not found');
};

export { getAreas, getAreaById, createArea, updateArea, removeArea };
