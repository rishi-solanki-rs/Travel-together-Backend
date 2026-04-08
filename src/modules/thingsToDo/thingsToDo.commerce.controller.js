import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  reserveSeatsHold,
  createReservation,
  confirmReservation,
  cancelReservation,
  getVendorDepartureDashboard,
} from './thingsToDo.commerce.service.js';

const holdReservation = asyncHandler(async (req, res) => {
  const reservation = await reserveSeatsHold({ ...req.body, userId: req.user?.id, vendorId: req.user?.vendorId || req.body.vendorId });
  ApiResponse.created(res, 'Seat hold created', reservation);
});

const createReservationFlow = asyncHandler(async (req, res) => {
  const reservation = await createReservation({ ...req.body, userId: req.user?.id, vendorId: req.user?.vendorId || req.body.vendorId });
  ApiResponse.created(res, 'Reservation created', reservation);
});

const confirmReservationFlow = asyncHandler(async (req, res) => {
  const reservation = await confirmReservation({ reservationId: req.params.reservationId, payment: req.body.payment || req.body });
  ApiResponse.success(res, 'Reservation confirmed', reservation);
});

const cancelReservationFlow = asyncHandler(async (req, res) => {
  const reservation = await cancelReservation({ reservationId: req.params.reservationId, reason: req.body.reason });
  ApiResponse.success(res, 'Reservation cancelled', reservation);
});

const vendorDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getVendorDepartureDashboard(req.user.vendorId);
  ApiResponse.success(res, 'Vendor departure dashboard fetched', dashboard);
});

export {
  holdReservation,
  createReservationFlow,
  confirmReservationFlow,
  cancelReservationFlow,
  vendorDashboard,
};
