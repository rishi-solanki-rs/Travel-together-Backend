import HotelRoom from '../../shared/models/HotelRoom.model.js';
import HotelPricingCalendar from '../../shared/models/HotelPricingCalendar.model.js';
import HotelBooking from '../../shared/models/HotelBooking.model.js';
import BookingGuest from '../../shared/models/BookingGuest.model.js';
import PaymentTransaction from '../../shared/models/PaymentTransaction.model.js';
import Refund from '../../shared/models/Refund.model.js';
import Invoice from '../../shared/models/Invoice.model.js';
import ApiError from '../../utils/ApiError.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { appendPaymentLedger } from '../../operations/finance/reconciliation.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';

const HOLD_MINUTES = 15;

const toDayStart = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const enumerateStayDates = (checkInDate, checkOutDate) => {
  const start = toDayStart(checkInDate);
  const end = toDayStart(checkOutDate);
  if (end <= start) {
    throw ApiError.badRequest('checkOutDate must be after checkInDate');
  }
  const dates = [];
  const cursor = new Date(start);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const calculateNights = (checkInDate, checkOutDate) => enumerateStayDates(checkInDate, checkOutDate).length;

const validateAvailabilitySnapshot = ({ calendarRows, stayDates, roomsBooked }) => {
  if (calendarRows.length !== stayDates.length) {
    throw ApiError.badRequest('Pricing calendar is not available for complete stay range');
  }
  for (const row of calendarRows) {
    if (row.isBlackout) {
      throw ApiError.badRequest('Selected dates include blackout period');
    }
    if ((row.availability || 0) < roomsBooked) {
      throw ApiError.badRequest('Selected stay window is sold out');
    }
  }
  return true;
};

const buildBookingRef = () => `HTL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const buildInvoiceNumber = () => `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const decrementCalendar = async ({ roomId, stayDates, roomsBooked, session }) => {
  for (const date of stayDates) {
    const updated = await HotelPricingCalendar.findOneAndUpdate(
      {
        roomId,
        date,
        isBlackout: false,
        availability: { $gte: roomsBooked },
      },
      {
        $inc: { availability: -roomsBooked },
      },
      { session, new: true }
    );
    if (!updated) {
      throw ApiError.badRequest('Unable to reserve inventory for requested stay dates');
    }
  }
};

const incrementCalendar = async ({ roomId, stayDates, roomsBooked, session }) => {
  for (const date of stayDates) {
    await HotelPricingCalendar.findOneAndUpdate(
      { roomId, date },
      { $inc: { availability: roomsBooked } },
      { session }
    );
  }
};

const holdBooking = async (payload) => withTransaction(async ({ session }) => {
  const {
    hotelId,
    roomId,
    vendorId,
    listingId = null,
    userId = null,
    checkInDate,
    checkOutDate,
    roomsBooked = 1,
    guestsCount = 1,
    holdMinutes = HOLD_MINUTES,
    amount = null,
    guests = [],
  } = payload;

  const room = await HotelRoom.findOne({ _id: roomId, hotelId, vendorId, isDeleted: false, isActive: true }).session(session);
  if (!room) throw ApiError.notFound('Room not found');

  const stayDates = enumerateStayDates(checkInDate, checkOutDate);
  const calendarRows = await HotelPricingCalendar.find({ roomId, date: { $in: stayDates } }).session(session).lean();
  validateAvailabilitySnapshot({ calendarRows, stayDates, roomsBooked });

  await decrementCalendar({ roomId, stayDates, roomsBooked, session });

  const nights = stayDates.length;
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
  const bookingRef = buildBookingRef();

  const [booking] = await HotelBooking.create([{
    hotelId,
    roomId,
    vendorId,
    listingId,
    bookedByUserId: userId,
    bookingRef,
    status: 'hold',
    checkInDate,
    checkOutDate,
    nights,
    roomsBooked,
    guestsCount,
    holdExpiresAt,
    amount: amount || { subtotal: 0, taxes: 0, total: 0, currency: 'INR' },
    analytics: { source: 'direct', conversionStage: 'hold' },
  }], { session });

  if (Array.isArray(guests) && guests.length) {
    await BookingGuest.insertMany(
      guests.map((guest, idx) => ({
        bookingId: booking._id,
        fullName: guest.fullName,
        age: guest.age ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        idType: guest.idType ?? null,
        idNumber: guest.idNumber ?? null,
        isPrimary: idx === 0,
      })),
      { session }
    );
  }

  await recordAuditEvent({
    eventType: 'bookings.hotel.hold',
    module: 'hotels',
    entityType: 'HotelBooking',
    entityId: booking._id,
    action: 'hold-booking',
    actor: { actorType: 'user', actorId: userId, vendorId },
    afterSnapshot: { status: booking.status, holdExpiresAt, roomsBooked, guestsCount },
  });
  incrementCounter('tii_booking_funnel_total', 1, { module: 'hotels', stage: 'hold' });

  return booking;
});

const confirmBooking = async ({ bookingId, payment = {} }) => withTransaction(async ({ session }) => {
  const booking = await HotelBooking.findById(bookingId).session(session);
  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.status === 'confirmed') return booking;
  if (booking.status !== 'hold') throw ApiError.badRequest('Only held bookings can be confirmed');
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    throw ApiError.badRequest('Booking hold has expired');
  }

  const paymentRef = payment.gatewayReference || `PAY-${booking.bookingRef}`;
  await PaymentTransaction.create([{
    bookingId: booking._id,
    provider: payment.provider || 'manual',
    gatewayReference: paymentRef,
    amount: booking.amount.total,
    currency: booking.amount.currency || 'INR',
    status: 'captured',
  }], { session });

  const invoiceNumber = buildInvoiceNumber();
  await Invoice.create([{
    invoiceNumber,
    bookingId: booking._id,
    issuedTo: {
      name: payment.payerName || null,
      email: payment.payerEmail || null,
      phone: payment.payerPhone || null,
    },
    lineItems: [{
      title: `Hotel stay (${booking.bookingRef})`,
      quantity: booking.nights,
      unitPrice: booking.nights ? booking.amount.total / booking.nights : booking.amount.total,
      total: booking.amount.total,
    }],
    amount: booking.amount,
    status: 'issued',
  }], { session });

  await appendPaymentLedger({
    sourceType: 'hotel-booking',
    sourceId: booking._id,
    paymentReference: paymentRef,
    entries: [
      { account: 'cash', direction: 'debit', amount: booking.amount.total },
      { account: 'hotel_revenue', direction: 'credit', amount: booking.amount.total },
    ],
    metadata: { bookingRef: booking.bookingRef, vendorId: booking.vendorId },
  });

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.holdExpiresAt = null;
  booking.analytics = { ...(booking.analytics || {}), conversionStage: 'confirmed' };
  await booking.save({ session });
  await recordAuditEvent({
    eventType: 'bookings.hotel.confirmed',
    module: 'hotels',
    entityType: 'HotelBooking',
    entityId: booking._id,
    action: 'confirm-booking',
    afterSnapshot: { status: booking.status, paymentStatus: booking.paymentStatus },
  });
  await recordFinancialLedgerEvent({
    domain: 'bookings',
    entityType: 'HotelBooking',
    entityId: booking._id,
    eventType: 'booking-confirmed',
    amount: booking.amount.total,
    metadata: { bookingRef: booking.bookingRef, vendorId: booking.vendorId },
  });
  await enqueueJob('booking-confirmations', 'hotel-booking-confirmed', { bookingId: String(booking._id), vendorId: String(booking.vendorId) });
  await enqueueJob('invoices', 'hotel-invoice-issued', { bookingId: String(booking._id), invoiceNumber });
  await enqueueJob('emails', 'hotel-booking-confirmation-email', { bookingId: String(booking._id) });
  incrementCounter('tii_booking_funnel_total', 1, { module: 'hotels', stage: 'confirmed' });
  incrementCounter('tii_payment_success_total', 1, { module: 'hotels' });
  return booking;
});

const cancelBooking = async ({ bookingId, reason = 'cancelled_by_user', refundPercent = 100 }) => withTransaction(async ({ session }) => {
  const booking = await HotelBooking.findById(bookingId).session(session);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (['cancelled', 'refunded', 'expired'].includes(booking.status)) return booking;

  const stayDates = enumerateStayDates(booking.checkInDate, booking.checkOutDate);
  await incrementCalendar({ roomId: booking.roomId, stayDates, roomsBooked: booking.roomsBooked, session });

  if (booking.paymentStatus === 'paid') {
    const refundAmount = Number(((booking.amount.total * refundPercent) / 100).toFixed(2));
    await Refund.create([{
      bookingId: booking._id,
      amount: refundAmount,
      reason,
      status: 'processed',
    }], { session });
    await enqueueJob('refunds', 'hotel-booking-refund', { bookingId: String(booking._id), refundAmount, reason });
    booking.paymentStatus = 'refunded';
    booking.status = 'refunded';
  } else {
    booking.status = 'cancelled';
  }

  booking.cancellationReason = reason;
  await booking.save({ session });
  await recordAuditEvent({
    eventType: 'bookings.hotel.cancelled',
    module: 'hotels',
    entityType: 'HotelBooking',
    entityId: booking._id,
    action: 'cancel-booking',
    afterSnapshot: { status: booking.status, paymentStatus: booking.paymentStatus, reason },
  });
  await recordFinancialLedgerEvent({
    domain: 'refunds',
    entityType: 'HotelBooking',
    entityId: booking._id,
    eventType: 'booking-refund',
    amount: booking.paymentStatus === 'refunded' ? booking.amount.total : 0,
    metadata: { reason, vendorId: booking.vendorId },
  });
  return booking;
});

const checkInBooking = async (bookingId) => {
  const booking = await HotelBooking.findByIdAndUpdate(
    bookingId,
    { status: 'checked_in' },
    { new: true }
  );
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
};

const checkOutBooking = async (bookingId) => {
  const booking = await HotelBooking.findByIdAndUpdate(
    bookingId,
    { status: 'checked_out' },
    { new: true }
  );
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
};

const createBooking = async (payload) => {
  const held = await holdBooking(payload);
  return confirmBooking({ bookingId: held._id, payment: payload.payment || {} });
};

const expireReservationHolds = async () => {
  const expiredHolds = await HotelBooking.find({ status: 'hold', holdExpiresAt: { $lte: new Date() } }).lean();
  for (const booking of expiredHolds) {
    await cancelBooking({ bookingId: booking._id, reason: 'hold_expired', refundPercent: 0 });
  }
  return { expired: expiredHolds.length };
};

const listVendorBookings = async (vendorId, query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = { vendorId };
  if (query.status) filter.status = query.status;
  const [bookings, total] = await Promise.all([
    HotelBooking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage),
    HotelBooking.countDocuments(filter),
  ]);
  return { bookings, pagination: buildPaginationMeta(page, perPage, total) };
};

const computeOccupancyMetrics = ({ bookings = [], fromDate, toDate, roomInventory = 1 }) => {
  const totalNights = enumerateStayDates(fromDate, toDate).length * Math.max(roomInventory, 1);
  const bookedNights = bookings.reduce((acc, booking) => acc + ((booking.nights || 0) * (booking.roomsBooked || 1)), 0);
  const occupancyRate = totalNights === 0 ? 0 : Number(((bookedNights / totalNights) * 100).toFixed(2));
  return {
    totalNights,
    bookedNights,
    occupancyRate,
  };
};

const getRoomOccupancyStats = async ({ vendorId, roomId, fromDate, toDate }) => {
  const room = await HotelRoom.findOne({ _id: roomId, vendorId, isDeleted: false }).lean();
  if (!room) throw ApiError.notFound('Room not found');

  const bookings = await HotelBooking.find({
    vendorId,
    roomId,
    status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
    checkInDate: { $lt: new Date(toDate) },
    checkOutDate: { $gt: new Date(fromDate) },
  }).lean();

  return computeOccupancyMetrics({
    bookings,
    fromDate,
    toDate,
    roomInventory: room.totalInventory || 1,
  });
};

export {
  enumerateStayDates,
  calculateNights,
  validateAvailabilitySnapshot,
  computeOccupancyMetrics,
  holdBooking,
  createBooking,
  confirmBooking,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  expireReservationHolds,
  listVendorBookings,
  getRoomOccupancyStats,
};
