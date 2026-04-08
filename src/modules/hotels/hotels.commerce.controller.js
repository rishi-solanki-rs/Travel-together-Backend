import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  holdBooking,
  createBooking,
  confirmBooking,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  listVendorBookings,
  getRoomOccupancyStats,
} from './hotels.commerce.service.js';

const hold = asyncHandler(async (req, res) => {
  const booking = await holdBooking({ ...req.body, userId: req.user?.id, vendorId: req.user?.vendorId || req.body.vendorId });
  ApiResponse.created(res, 'Booking hold created', booking);
});

const create = asyncHandler(async (req, res) => {
  const booking = await createBooking({ ...req.body, userId: req.user?.id, vendorId: req.user?.vendorId || req.body.vendorId });
  ApiResponse.created(res, 'Booking created', booking);
});

const confirm = asyncHandler(async (req, res) => {
  const booking = await confirmBooking({ bookingId: req.params.bookingId, payment: req.body.payment || req.body });
  ApiResponse.success(res, 'Booking confirmed', booking);
});

const cancel = asyncHandler(async (req, res) => {
  const booking = await cancelBooking({ bookingId: req.params.bookingId, reason: req.body.reason, refundPercent: req.body.refundPercent });
  ApiResponse.success(res, 'Booking cancelled', booking);
});

const checkIn = asyncHandler(async (req, res) => {
  const booking = await checkInBooking(req.params.bookingId);
  ApiResponse.success(res, 'Booking checked-in', booking);
});

const checkOut = asyncHandler(async (req, res) => {
  const booking = await checkOutBooking(req.params.bookingId);
  ApiResponse.success(res, 'Booking checked-out', booking);
});

const vendorBookings = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await listVendorBookings(req.user.vendorId, req.query);
  ApiResponse.paginated(res, 'Vendor bookings fetched', bookings, pagination);
});

const occupancy = asyncHandler(async (req, res) => {
  const stats = await getRoomOccupancyStats({
    vendorId: req.user.vendorId,
    roomId: req.params.roomId,
    fromDate: req.query.fromDate || new Date(),
    toDate: req.query.toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  ApiResponse.success(res, 'Room occupancy stats fetched', stats);
});

export { hold, create, confirm, cancel, checkIn, checkOut, vendorBookings, occupancy };
