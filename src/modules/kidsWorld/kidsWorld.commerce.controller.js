import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  createGuardianProfile,
  createChildProfile,
  createSessionBooking,
  confirmSessionBooking,
  cancelSessionBooking,
  markAttendance,
  getVendorSessionCalendarDashboard,
} from './kidsWorld.commerce.service.js';

const createGuardian = asyncHandler(async (req, res) => {
  const guardian = await createGuardianProfile({ ...req.body, userId: req.user?.id || req.body.userId });
  ApiResponse.created(res, 'Guardian profile created', guardian);
});

const createChild = asyncHandler(async (req, res) => {
  const child = await createChildProfile(req.body);
  ApiResponse.created(res, 'Child profile created', child);
});

const bookSession = asyncHandler(async (req, res) => {
  const result = await createSessionBooking({ ...req.body, vendorId: req.user?.vendorId || req.body.vendorId });
  ApiResponse.created(res, result.waitlisted ? 'Added to waitlist' : 'Session booking created', result);
});

const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await confirmSessionBooking(req.params.bookingId);
  ApiResponse.success(res, 'Session booking confirmed', booking);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await cancelSessionBooking({ bookingId: req.params.bookingId, reason: req.body.reason });
  ApiResponse.success(res, 'Session booking cancelled', booking);
});

const attendance = asyncHandler(async (req, res) => {
  const log = await markAttendance({ bookingId: req.params.bookingId, status: req.body.status, notes: req.body.notes });
  ApiResponse.success(res, 'Attendance logged', log);
});

const vendorCalendar = asyncHandler(async (req, res) => {
  const dashboard = await getVendorSessionCalendarDashboard({ vendorId: req.user.vendorId, listingId: req.params.listingId });
  ApiResponse.success(res, 'Vendor session calendar fetched', dashboard);
});

export { createGuardian, createChild, bookSession, confirmBooking, cancelBooking, attendance, vendorCalendar };
