import TourDeparture from '../../shared/models/TourDeparture.model.js';
import TourReservation from '../../shared/models/TourReservation.model.js';
import SeatAllocation from '../../shared/models/SeatAllocation.model.js';
import ParticipantManifest from '../../shared/models/ParticipantManifest.model.js';
import TourPayment from '../../shared/models/TourPayment.model.js';
import Refund from '../../shared/models/Refund.model.js';
import CancellationPolicy from '../../shared/models/CancellationPolicy.model.js';
import ApiError from '../../utils/ApiError.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';

const DEFAULT_CUTOFF_HOURS = 2;
const HOLD_MINUTES = 10;

const enforceSameDayBookingCutoff = ({ departureDate, cutoffHours = DEFAULT_CUTOFF_HOURS, now = new Date() }) => {
  const departure = new Date(departureDate);
  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  return departure.getTime() - now.getTime() >= cutoffMs;
};

const buildReservationRef = () => `TOUR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const reserveSeatsHold = async ({
  departureId,
  itineraryId,
  listingId,
  vendorId,
  userId = null,
  seatsReserved,
  participants = [],
  tourType = 'fixed_departure',
  amount = 0,
}) => withTransaction(async ({ session }) => {
  const departure = await TourDeparture.findOne({ _id: departureId, vendorId, listingId, itineraryId, isActive: true }).session(session);
  if (!departure) throw ApiError.notFound('Departure not found');
  if (!['scheduled', 'confirmed'].includes(departure.status)) throw ApiError.badRequest('Departure is not open for booking');

  if (tourType === 'same_day') {
    const allowed = enforceSameDayBookingCutoff({ departureDate: departure.departureDate });
    if (!allowed) throw ApiError.badRequest('Same-day booking cutoff has passed');
  }

  const updatedDeparture = await TourDeparture.findOneAndUpdate(
    {
      _id: departureId,
      'seats.available': { $gte: seatsReserved },
      status: { $in: ['scheduled', 'confirmed'] },
    },
    {
      $inc: { 'seats.available': -seatsReserved, 'seats.booked': seatsReserved },
    },
    { session, new: true }
  );
  if (!updatedDeparture) throw ApiError.badRequest('Insufficient seat availability');

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const reservationRef = buildReservationRef();
  const [reservation] = await TourReservation.create([{
    listingId,
    itineraryId,
    departureId,
    vendorId,
    reservedByUserId: userId,
    reservationRef,
    tourType,
    status: 'hold',
    seatsReserved,
    holdExpiresAt,
    bookingCutoffApplied: tourType === 'same_day',
    amount: { total: amount, currency: departure?.pricing?.currency || 'INR' },
    analytics: { source: 'direct', conversionStage: 'hold' },
  }], { session });

  await SeatAllocation.create([{
    reservationId: reservation._id,
    departureId,
    seatCount: seatsReserved,
    status: 'hold',
    expiresAt: holdExpiresAt,
  }], { session });

  if (participants.length) {
    await ParticipantManifest.insertMany(participants.map((participant) => ({
      reservationId: reservation._id,
      fullName: participant.fullName,
      age: participant.age ?? null,
      gender: participant.gender ?? null,
      phone: participant.phone ?? null,
      email: participant.email ?? null,
      specialNeeds: participant.specialNeeds ?? null,
    })), { session });
  }

  await recordAuditEvent({
    eventType: 'bookings.tour.hold',
    module: 'thingsToDo',
    entityType: 'TourReservation',
    entityId: reservation._id,
    action: 'hold-reservation',
    actor: { actorType: 'user', actorId: userId, vendorId },
    afterSnapshot: { status: reservation.status, seatsReserved, holdExpiresAt },
  });
  incrementCounter('tii_booking_funnel_total', 1, { module: 'thingsToDo', stage: 'hold' });

  return reservation;
});

const confirmReservation = async ({ reservationId, payment = {} }) => withTransaction(async ({ session }) => {
  const reservation = await TourReservation.findById(reservationId).session(session);
  if (!reservation) throw ApiError.notFound('Reservation not found');
  if (reservation.status === 'confirmed') return reservation;
  if (reservation.status !== 'hold') throw ApiError.badRequest('Only held reservations can be confirmed');
  if (reservation.holdExpiresAt && reservation.holdExpiresAt < new Date()) throw ApiError.badRequest('Seat hold has expired');

  await TourPayment.create([{
    reservationId: reservation._id,
    provider: payment.provider || 'manual',
    gatewayReference: payment.gatewayReference || `TOURPAY-${reservation.reservationRef}`,
    amount: reservation.amount.total,
    currency: reservation.amount.currency || 'INR',
    status: 'captured',
  }], { session });

  await SeatAllocation.updateMany({ reservationId: reservation._id, status: 'hold' }, { $set: { status: 'confirmed', expiresAt: null } }, { session });

  reservation.status = 'confirmed';
  reservation.holdExpiresAt = null;
  reservation.analytics = { ...(reservation.analytics || {}), conversionStage: 'confirmed' };
  await reservation.save({ session });
  await recordAuditEvent({
    eventType: 'bookings.tour.confirmed',
    module: 'thingsToDo',
    entityType: 'TourReservation',
    entityId: reservation._id,
    action: 'confirm-reservation',
    afterSnapshot: { status: reservation.status },
  });
  await recordFinancialLedgerEvent({
    domain: 'bookings',
    entityType: 'TourReservation',
    entityId: reservation._id,
    eventType: 'tour-reservation-confirmed',
    amount: reservation.amount.total,
    metadata: { vendorId: reservation.vendorId },
  });
  await enqueueJob('booking-confirmations', 'tour-reservation-confirmed', { reservationId: String(reservation._id), vendorId: String(reservation.vendorId) });
  incrementCounter('tii_booking_funnel_total', 1, { module: 'thingsToDo', stage: 'confirmed' });
  incrementCounter('tii_payment_success_total', 1, { module: 'thingsToDo' });
  return reservation;
});

const getCancellationPolicy = async ({ vendorId, listingId }) => {
  return CancellationPolicy.findOne({ vendorId, listingId, scopeType: 'tour' }).lean();
};

const cancelReservation = async ({ reservationId, reason = 'cancelled', now = new Date() }) => withTransaction(async ({ session }) => {
  const reservation = await TourReservation.findById(reservationId).session(session);
  if (!reservation) throw ApiError.notFound('Reservation not found');
  if (['cancelled', 'expired'].includes(reservation.status)) return reservation;

  await TourDeparture.findByIdAndUpdate(
    reservation.departureId,
    { $inc: { 'seats.available': reservation.seatsReserved, 'seats.booked': -reservation.seatsReserved } },
    { session }
  );

  await SeatAllocation.updateMany({ reservationId: reservation._id, status: { $in: ['hold', 'confirmed'] } }, { $set: { status: 'released' } }, { session });

  if (reservation.status === 'confirmed') {
    const policy = await getCancellationPolicy({ vendorId: reservation.vendorId, listingId: reservation.listingId });
    const cutoffHours = policy?.cancellationCutoffHours ?? 24;
    const refundPercent = policy?.refundPercent ?? 100;
    const departure = await TourDeparture.findById(reservation.departureId).session(session).lean();
    const beforeCutoff = enforceSameDayBookingCutoff({ departureDate: departure.departureDate, cutoffHours, now });
    const appliedPercent = beforeCutoff ? refundPercent : 0;
    await Refund.create([{
      reservationId: reservation._id,
      amount: Number(((reservation.amount.total * appliedPercent) / 100).toFixed(2)),
      reason,
      status: 'processed',
    }], { session });
  }

  reservation.status = 'cancelled';
  await reservation.save({ session });
  await recordAuditEvent({
    eventType: 'bookings.tour.cancelled',
    module: 'thingsToDo',
    entityType: 'TourReservation',
    entityId: reservation._id,
    action: 'cancel-reservation',
    afterSnapshot: { status: reservation.status, reason },
  });
  await enqueueJob('refunds', 'tour-reservation-refund', { reservationId: String(reservation._id), reason });
  return reservation;
});

const createReservation = async (payload) => {
  const held = await reserveSeatsHold(payload);
  return confirmReservation({ reservationId: held._id, payment: payload.payment || {} });
};

const expireSeatHolds = async () => {
  const expired = await TourReservation.find({ status: 'hold', holdExpiresAt: { $lte: new Date() } }).lean();
  for (const reservation of expired) {
    await cancelReservation({ reservationId: reservation._id, reason: 'hold_expired' });
    await TourReservation.findByIdAndUpdate(reservation._id, { status: 'expired' });
  }
  return { expiredCount: expired.length };
};

const getVendorDepartureDashboard = async (vendorId) => {
  const [reservations, departures] = await Promise.all([
    TourReservation.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TourDeparture.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalSeats: { $sum: '$seats.total' }, bookedSeats: { $sum: '$seats.booked' } } },
    ]),
  ]);

  return {
    reservationStatus: reservations,
    departureStatus: departures,
  };
};

const getTourAnalyticsCounters = (reservations = []) => {
  return reservations.reduce((acc, reservation) => {
    acc.total += 1;
    if (reservation.status === 'confirmed') acc.confirmed += 1;
    if (reservation.status === 'cancelled') acc.cancelled += 1;
    acc.seats += reservation.seatsReserved || 0;
    return acc;
  }, { total: 0, confirmed: 0, cancelled: 0, seats: 0 });
};

export {
  enforceSameDayBookingCutoff,
  getTourAnalyticsCounters,
  reserveSeatsHold,
  createReservation,
  confirmReservation,
  cancelReservation,
  expireSeatHolds,
  getVendorDepartureDashboard,
};
