import Hotel from '../../shared/models/Hotel.model.js';
import HotelRoom from '../../shared/models/HotelRoom.model.js';
import HotelPricingCalendar from '../../shared/models/HotelPricingCalendar.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';

const createHotelProfile = async (listingId, vendorId, data) => {
  const existing = await Hotel.findOne({ listingId });
  if (existing) throw ApiError.conflict('Hotel profile already exists for this listing');
  return Hotel.create({ ...data, listingId, vendorId });
};

const getHotelByListing = async (listingId) => {
  const hotel = await Hotel.findOne({ listingId }).lean();
  if (!hotel) throw ApiError.notFound('Hotel profile not found');
  return hotel;
};

const updateHotelProfile = async (listingId, vendorId, data) => {
  const hotel = await Hotel.findOneAndUpdate({ listingId, vendorId }, data, { new: true, upsert: false });
  if (!hotel) throw ApiError.notFound('Hotel profile not found');
  return hotel;
};

const addRoom = async (hotelId, vendorId, listingId, data) => {
  return HotelRoom.create({ ...data, hotelId, vendorId, listingId });
};

const getRooms = async (hotelId) => {
  return HotelRoom.find({ hotelId, isDeleted: false, isActive: true }).sort({ basePrice: 1 });
};

const updateRoom = async (roomId, vendorId, data) => {
  const room = await HotelRoom.findOneAndUpdate({ _id: roomId, vendorId }, data, { new: true });
  if (!room) throw ApiError.notFound('Room not found');
  return room;
};

const deleteRoom = async (roomId, vendorId) => {
  const room = await HotelRoom.findOneAndUpdate({ _id: roomId, vendorId }, { isDeleted: true, isActive: false });
  if (!room) throw ApiError.notFound('Room not found');
};

const setPricingCalendar = async (hotelId, roomId, vendorId, entries) => {
  const bulk = entries.map(entry => ({
    updateOne: {
      filter: { roomId, date: entry.date },
      update: { $set: { ...entry, hotelId, vendorId, dayOfWeek: new Date(entry.date).getDay() } },
      upsert: true,
    },
  }));
  return HotelPricingCalendar.bulkWrite(bulk);
};

const getPricingCalendar = async (roomId, startDate, endDate) => {
  return HotelPricingCalendar.find({
    roomId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).sort({ date: 1 });
};

const setBlackoutDates = async (hotelId, vendorId, dates, reason) => {
  const bulk = dates.map(date => ({
    updateMany: {
      filter: { hotelId, date: new Date(date) },
      update: { $set: { isBlackout: true, blackoutReason: reason, availability: 0 } },
    },
  }));
  return HotelPricingCalendar.bulkWrite(bulk);
};

export default {
  createHotelProfile, getHotelByListing, updateHotelProfile,
  addRoom, getRooms, updateRoom, deleteRoom,
  setPricingCalendar, getPricingCalendar, setBlackoutDates,
};
