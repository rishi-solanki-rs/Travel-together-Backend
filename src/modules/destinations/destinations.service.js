import DestinationPackage from '../../shared/models/DestinationPackage.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const createPackage = async (listingId, vendorId, data) => {
  const existing = await DestinationPackage.findOne({ listingId });
  if (existing) throw ApiError.conflict('Destination package already exists');
  return DestinationPackage.create({ ...data, listingId, vendorId });
};

const getPackage = async (listingId) => {
  const pkg = await DestinationPackage.findOne({ listingId }).lean();
  if (!pkg) throw ApiError.notFound('Package not found');
  return pkg;
};

const updatePackage = async (listingId, vendorId, data) => {
  const pkg = await DestinationPackage.findOneAndUpdate({ listingId, vendorId }, data, { new: true });
  if (!pkg) throw ApiError.notFound('Package not found');
  return pkg;
};

const addDepartureDate = async (listingId, vendorId, departureData) => {
  return DestinationPackage.findOneAndUpdate(
    { listingId, vendorId },
    { $push: { departureDates: departureData } },
    { new: true }
  );
};

const getPackagesByType = async (packageType, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { packageType, isActive: true };
  const [packages, total] = await Promise.all([
    DestinationPackage.find(filter).sort({ 'pricing.perPersonDouble': 1 }).skip(skip).limit(perPage),
    DestinationPackage.countDocuments(filter),
  ]);
  return { packages, pagination: buildPaginationMeta(page, perPage, total) };
};

export { createPackage, getPackage, updatePackage, addDepartureDate, getPackagesByType };
