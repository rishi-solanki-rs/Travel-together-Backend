import TourItinerary from '../../shared/models/TourItinerary.model.js';
import TourDeparture from '../../shared/models/TourDeparture.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const createItinerary = async (listingId, vendorId, data) => {
  return TourItinerary.create({ ...data, listingId, vendorId });
};

const getItineraries = async (listingId) => {
  return TourItinerary.find({ listingId, isActive: true }).lean();
};

const updateItinerary = async (id, vendorId, data) => {
  const itinerary = await TourItinerary.findOneAndUpdate({ _id: id, vendorId }, data, { new: true });
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  return itinerary;
};

const addDeparture = async (listingId, itineraryId, vendorId, data) => {
  return TourDeparture.create({ ...data, listingId, itineraryId, vendorId });
};

const getUpcomingDepartures = async (listingId, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = {
    listingId,
    departureDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] },
    isActive: true,
  };
  if (query.startDate) filter.departureDate.$gte = new Date(query.startDate);
  if (query.endDate) filter.departureDate.$lte = new Date(query.endDate);

  const [departures, total] = await Promise.all([
    TourDeparture.find(filter).sort({ departureDate: 1 }).skip(skip).limit(perPage),
    TourDeparture.countDocuments(filter),
  ]);
  return { departures, pagination: buildPaginationMeta(page, perPage, total) };
};

const updateDeparture = async (id, vendorId, data) => {
  const departure = await TourDeparture.findOneAndUpdate({ _id: id, vendorId }, data, { new: true });
  if (!departure) throw ApiError.notFound('Departure not found');
  return departure;
};

const cancelDeparture = async (id, vendorId, reason) => {
  return TourDeparture.findOneAndUpdate({ _id: id, vendorId }, { status: 'cancelled', cancellationReason: reason }, { new: true });
};

export { createItinerary, getItineraries, updateItinerary, addDeparture, getUpcomingDepartures, updateDeparture, cancelDeparture };
