import hotelsService from './hotels.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createProfile = asyncHandler(async (req, res) => {
  const hotel = await hotelsService.createHotelProfile(req.params.listingId, req.user.vendorId, req.body);
  ApiResponse.created(res, 'Hotel profile created', hotel);
});

const getProfile = asyncHandler(async (req, res) => {
  const hotel = await hotelsService.getHotelByListing(req.params.listingId);
  ApiResponse.success(res, 'Hotel profile fetched', hotel);
});

const updateProfile = asyncHandler(async (req, res) => {
  const hotel = await hotelsService.updateHotelProfile(req.params.listingId, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Hotel profile updated', hotel);
});

const addRoom = asyncHandler(async (req, res) => {
  const room = await hotelsService.addRoom(req.params.hotelId, req.user.vendorId, req.body.listingId, req.body);
  ApiResponse.created(res, 'Room added', room);
});

const getRooms = asyncHandler(async (req, res) => {
  const rooms = await hotelsService.getRooms(req.params.hotelId);
  ApiResponse.success(res, 'Rooms fetched', rooms);
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await hotelsService.updateRoom(req.params.roomId, req.user.vendorId, req.body);
  ApiResponse.success(res, 'Room updated', room);
});

const deleteRoom = asyncHandler(async (req, res) => {
  await hotelsService.deleteRoom(req.params.roomId, req.user.vendorId);
  ApiResponse.noContent(res);
});

const setPricing = asyncHandler(async (req, res) => {
  await hotelsService.setPricingCalendar(req.params.hotelId, req.params.roomId, req.user.vendorId, req.body.entries);
  ApiResponse.success(res, 'Pricing calendar updated');
});

const getPricing = asyncHandler(async (req, res) => {
  const pricing = await hotelsService.getPricingCalendar(req.params.roomId, req.query.startDate, req.query.endDate);
  ApiResponse.success(res, 'Pricing calendar fetched', pricing);
});

const setBlackout = asyncHandler(async (req, res) => {
  await hotelsService.setBlackoutDates(req.params.hotelId, req.user.vendorId, req.body.dates, req.body.reason);
  ApiResponse.success(res, 'Blackout dates set');
});

export { createProfile, getProfile, updateProfile, addRoom, getRooms, updateRoom, deleteRoom, setPricing, getPricing, setBlackout };
