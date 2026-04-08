import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import ProductItem from '../../shared/models/ProductItem.model.js';
import HotelBooking from '../../shared/models/HotelBooking.model.js';
import SessionBooking from '../../shared/models/SessionBooking.model.js';
import Order from '../../shared/models/Order.model.js';
import TourReservation from '../../shared/models/TourReservation.model.js';
import PaymentTransaction from '../../shared/models/PaymentTransaction.model.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import { appendPaymentLedger } from '../../operations/finance/reconciliation.service.js';
import { recordAuditEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import {
  findUserHotels,
  findUserSessionBookings,
  findUserOrders,
  findUserTours,
  findInvoiceByEntity,
  findAnyBookingById,
  findPaymentByBookingEntity,
  createRefundForEntity,
  findActiveCartWithItem,
  findActiveCart,
  findOrderOwnedByUser,
  findShipmentByOrder,
  vendorDashboardCounts,
  getVendorRevenue,
  reorderListingGallery,
} from './bookingHub.repository.js';
import { isValidBookingTransition, isCancellableStatus } from './bookingHub.state.js';

const asDate = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const resolveVerificationStatus = (statusOverride, txnStatus) => {
  if (statusOverride) return statusOverride;
  return txnStatus === 'initiated' ? 'processing' : txnStatus;
};

const computeOccupancyPercent = (activeNights, totalNights) => {
  if (!totalNights || totalNights <= 0) return 0;
  return Number(((Number(activeNights || 0) / Number(totalNights || 0)) * 100).toFixed(2));
};

const normalizeOrderedMediaIds = (orderedMediaIds = []) => {
  const seen = new Set();
  const out = [];
  for (const id of orderedMediaIds) {
    const key = String(id);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
};

const normalizeBookingRecord = (type, entry) => {
  const bookingDate = type === 'hotel'
    ? (entry.checkInDate || entry.createdAt)
    : type === 'kids'
      ? (entry.sessionDate || entry.createdAt)
      : entry.createdAt;

  const totalAmount = type === 'hotel'
    ? Number(entry.amount?.total || 0)
    : type === 'shop'
      ? Number(entry.totals?.total || 0)
      : type === 'tour'
        ? Number(entry.amount?.total || 0)
        : Number(entry.amount || 0);

  return {
    id: String(entry._id),
    type,
    status: entry.status,
    bookingDate,
    totalAmount,
    invoiceAvailable: false,
    vendorId: entry.vendorId ? String(entry.vendorId) : null,
    createdAt: entry.createdAt,
  };
};

const filterBookingRows = (rows, query = {}) => {
  let out = [...rows];
  if (query.status) out = out.filter((row) => row.status === query.status);
  if (query.type) out = out.filter((row) => row.type === query.type);
  if (query.vendorId) out = out.filter((row) => String(row.vendorId || '') === String(query.vendorId));
  if (query.upcoming) {
    const now = new Date();
    out = out.filter((row) => {
      const date = asDate(row.bookingDate);
      return date && date > now && !['cancelled', 'completed', 'returned', 'refunded'].includes(row.status);
    });
  }
  if (query.completed) {
    out = out.filter((row) => ['completed', 'checked_out', 'delivered', 'returned', 'attended'].includes(row.status));
  }
  if (query.from || query.to) {
    const from = query.from ? asDate(query.from) : null;
    const to = query.to ? asDate(query.to) : null;
    out = out.filter((row) => {
      const date = asDate(row.bookingDate);
      if (!date) return false;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  }
  return out;
};

const collectAdminBookingRecords = async () => {
  const [hotels, kids, orders, tours] = await Promise.all([
    HotelBooking.find({}).lean(),
    SessionBooking.find({}).lean(),
    Order.find({}).lean(),
    TourReservation.find({}).lean(),
  ]);

  return [
    ...hotels.map((entry) => normalizeBookingRecord('hotel', entry)),
    ...kids.map((entry) => normalizeBookingRecord('kids', entry)),
    ...orders.map((entry) => normalizeBookingRecord('shop', entry)),
    ...tours.map((entry) => normalizeBookingRecord('tour', entry)),
  ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

const bookingEventTimestamp = (entry) => {
  const candidate = entry?.changedAt || entry?.at || entry?.createdAt || entry?.updatedAt || null;
  const date = asDate(candidate);
  return date || new Date(0);
};

const flattenBookingTimeline = (type, entry) => {
  const baseId = String(entry._id);
  const timeline = [];

  timeline.push({
    bookingId: baseId,
    type,
    status: entry.status,
    action: 'created',
    note: null,
    at: entry.createdAt,
    vendorId: entry.vendorId ? String(entry.vendorId) : null,
  });

  for (const transition of entry.transitionHistory || []) {
    timeline.push({
      bookingId: baseId,
      type,
      status: transition.toStatus || entry.status,
      action: 'state_transition',
      note: transition.note || null,
      at: transition.changedAt || entry.updatedAt || entry.createdAt,
      changedBy: transition.changedBy ? String(transition.changedBy) : null,
      vendorId: entry.vendorId ? String(entry.vendorId) : null,
    });
  }

  for (const reschedule of entry.rescheduleHistory || []) {
    timeline.push({
      bookingId: baseId,
      type,
      status: entry.status,
      action: 'rescheduled',
      note: reschedule.notes || null,
      at: reschedule.changedAt || entry.updatedAt || entry.createdAt,
      changedBy: reschedule.changedBy ? String(reschedule.changedBy) : null,
      vendorId: entry.vendorId ? String(entry.vendorId) : null,
    });
  }

  for (const adminNote of entry.adminNotes || []) {
    timeline.push({
      bookingId: baseId,
      type,
      status: adminNote.status || entry.status,
      action: 'admin_note',
      note: adminNote.note || null,
      at: adminNote.at || entry.updatedAt || entry.createdAt,
      changedBy: adminNote.by ? String(adminNote.by) : null,
      vendorId: entry.vendorId ? String(entry.vendorId) : null,
    });
  }

  if (type === 'shop') {
    for (const item of entry.timeline || []) {
      timeline.push({
        bookingId: baseId,
        type,
        status: item.status || entry.status,
        action: 'order_timeline',
        note: item.note || null,
        at: item.at || entry.updatedAt || entry.createdAt,
        vendorId: entry.vendorId ? String(entry.vendorId) : null,
      });
    }
  }

  return timeline;
};

const collectAdminTimelineEvents = async () => {
  const [hotels, kids, orders, tours] = await Promise.all([
    HotelBooking.find({}).lean(),
    SessionBooking.find({}).lean(),
    Order.find({}).lean(),
    TourReservation.find({}).lean(),
  ]);

  return [
    ...hotels.flatMap((entry) => flattenBookingTimeline('hotel', entry)),
    ...kids.flatMap((entry) => flattenBookingTimeline('kids', entry)),
    ...orders.flatMap((entry) => flattenBookingTimeline('shop', entry)),
    ...tours.flatMap((entry) => flattenBookingTimeline('tour', entry)),
  ].sort((left, right) => bookingEventTimestamp(right) - bookingEventTimestamp(left));
};

const getAdminBookings = async (query = {}) => {
  const records = await collectAdminBookingRecords();
  const filtered = filterBookingRows(records, query);

  const { page, perPage, skip } = parsePaginationQuery({
    page: query.page,
    perPage: query.limit || query.perPage,
  });

  return {
    bookings: filtered.slice(skip, skip + perPage),
    pagination: buildPaginationMeta(page, perPage, filtered.length),
  };
};

const getAdminBookingTimeline = async (query = {}) => {
  const rows = await collectAdminTimelineEvents();
  const filtered = filterBookingRows(rows.map((row) => ({ ...row, bookingDate: row.at })), query);

  const { page, perPage, skip } = parsePaginationQuery({
    page: query.page,
    perPage: query.limit || query.perPage || 50,
  });

  return {
    items: filtered.slice(skip, skip + perPage),
    pagination: buildPaginationMeta(page, perPage, filtered.length),
    summary: {
      totalEvents: filtered.length,
      totalBookings: new Set(filtered.map((row) => row.bookingId)).size,
    },
  };
};

const getMyBookings = async (userId, query = {}) => {
  const [hotels, kids, orders, tours] = await Promise.all([
    findUserHotels(userId),
    findUserSessionBookings(userId),
    findUserOrders(userId),
    findUserTours(userId),
  ]);

  const merged = [
    ...hotels.map((x) => normalizeBookingRecord('hotel', x)),
    ...kids.map((x) => normalizeBookingRecord('kids', x)),
    ...orders.map((x) => normalizeBookingRecord('shop', x)),
    ...tours.map((x) => normalizeBookingRecord('tour', x)),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filtered = filterBookingRows(merged, query);

  const { page, perPage, skip } = parsePaginationQuery({
    page: query.page,
    perPage: query.limit || query.perPage,
  });

  const pageRows = filtered.slice(skip, skip + perPage);
  const withInvoice = await Promise.all(pageRows.map(async (row) => {
    const invoice = await findInvoiceByEntity({ type: row.type, id: row.id });
    return { ...row, invoiceAvailable: Boolean(invoice) };
  }));

  return {
    bookings: withInvoice,
    pagination: buildPaginationMeta(page, perPage, filtered.length),
  };
};

const assertOwnership = async ({ recordType, record, user }) => {
  if (recordType === 'hotel' && String(record.bookedByUserId || '') !== String(user.id)) throw ApiError.forbidden('Booking ownership mismatch');
  if (recordType === 'shop' && String(record.userId || '') !== String(user.id)) throw ApiError.forbidden('Order ownership mismatch');
  if (recordType === 'tour' && String(record.reservedByUserId || '') !== String(user.id)) throw ApiError.forbidden('Reservation ownership mismatch');
  if (recordType === 'kids') {
    const guardians = await findUserSessionBookings(user.id);
    const ok = guardians.some((entry) => String(entry._id) === String(record._id));
    if (!ok) throw ApiError.forbidden('Booking ownership mismatch');
  }
};

const cancelMyBooking = async ({ bookingId, reason = 'cancelled_by_user', refundAmount = null, user, correlationId }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');

  await assertOwnership({ recordType: found.type, record: found.record, user });

  if (!isCancellableStatus(found.record.status)) {
    throw ApiError.badRequest('Booking cannot be cancelled in current state');
  }

  const beforeSnapshot = found.record.toObject ? found.record.toObject() : { ...found.record };
  found.record.status = 'cancelled';

  const payment = await findPaymentByBookingEntity({ type: found.type, id: found.record._id });
  if (payment && ['captured', 'initiated'].includes(payment.status)) {
    const amount = Number(refundAmount || payment.amount || 0);
    await createRefundForEntity({
      type: found.type,
      id: found.record._id,
      paymentTransactionId: payment._id,
      amount,
      reason,
    });

    await appendPaymentLedger({
      sourceType: `${found.type}-refund`,
      sourceId: found.record._id,
      paymentReference: `REFUND-${payment.gatewayReference}`,
      entries: [
        { account: `${found.type}_revenue`, direction: 'debit', amount },
        { account: 'cash', direction: 'credit', amount },
      ],
      metadata: { reason, correlationId },
    });

    found.record.paymentStatus = 'refunded';
    found.record.refundStatus = 'refunded';
  }

  found.record.cancellationReason = reason;
  await found.record.save();

  const afterSnapshot = found.record.toObject ? found.record.toObject() : { ...found.record };
  await recordAuditEvent({
    eventType: 'bookings.self.cancelled',
    module: 'bookingHub',
    entityType: 'Booking',
    entityId: found.record._id,
    action: 'cancel-booking',
    actor: { actorType: 'user', actorId: user.id, vendorId: found.record.vendorId || null },
    context: { correlationId, module: 'bookingHub' },
    beforeSnapshot,
    afterSnapshot,
  });

  await enqueueJob('emails', 'booking-cancelled-email', { bookingId: String(found.record._id), type: found.type }, { correlationId });
  await enqueueJob('notifications', 'vendor-alert', { bookingId: String(found.record._id), type: found.type }, { correlationId });
  await enqueueJob('notifications', 'notification-center', { bookingId: String(found.record._id), type: found.type }, { correlationId });

  return found.record;
};

const rescheduleMyBooking = async ({ bookingId, newDate, checkOutDate = null, notes = null, user, correlationId }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');
  await assertOwnership({ recordType: found.type, record: found.record, user });

  const targetDate = new Date(newDate);
  if (targetDate <= new Date()) throw ApiError.badRequest('New date must be in the future');

  const beforeSnapshot = found.record.toObject ? found.record.toObject() : { ...found.record };

  if (found.type === 'hotel') {
    found.record.checkInDate = targetDate;
    if (checkOutDate) found.record.checkOutDate = new Date(checkOutDate);
    found.record.rescheduleHistory = [
      ...(found.record.rescheduleHistory || []),
      { previousDate: beforeSnapshot.checkInDate, newDate: targetDate, changedAt: new Date(), changedBy: user.id, notes },
    ];
  } else if (found.type === 'kids') {
    found.record.sessionDate = targetDate;
    found.record.rescheduleHistory = [
      ...(found.record.rescheduleHistory || []),
      { previousDate: beforeSnapshot.sessionDate || beforeSnapshot.createdAt, newDate: targetDate, changedAt: new Date(), changedBy: user.id, notes },
    ];
  } else if (found.type === 'tour') {
    found.record.departureDate = targetDate;
    found.record.rescheduleHistory = [
      ...(found.record.rescheduleHistory || []),
      { previousDate: beforeSnapshot.departureDate || beforeSnapshot.createdAt, newDate: targetDate, changedAt: new Date(), changedBy: user.id, notes },
    ];
  } else {
    throw ApiError.badRequest('Reschedule not supported for this booking type');
  }

  await found.record.save();

  await recordAuditEvent({
    eventType: 'bookings.self.rescheduled',
    module: 'bookingHub',
    entityType: 'Booking',
    entityId: found.record._id,
    action: 'reschedule-booking',
    actor: { actorType: 'user', actorId: user.id, vendorId: found.record.vendorId || null },
    context: { correlationId, module: 'bookingHub' },
    beforeSnapshot,
    afterSnapshot: found.record.toObject ? found.record.toObject() : { ...found.record },
  });

  await enqueueJob('notifications', 'booking-rescheduled-vendor', { bookingId: String(found.record._id), type: found.type }, { correlationId });
  await enqueueJob('notifications', 'booking-rescheduled-user', { bookingId: String(found.record._id), type: found.type }, { correlationId });

  return found.record;
};

const getInvoiceForBooking = async ({ bookingId, user }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');
  await assertOwnership({ recordType: found.type, record: found.record, user });

  const invoice = await findInvoiceByEntity({ type: found.type, id: found.record._id });
  if (!invoice) {
    return { state: 'pending', invoice: null, signedUrl: null };
  }

  const pdfUrl = invoice.pdfUrl || null;
  return {
    state: pdfUrl ? 'ready' : 'pending',
    invoice,
    signedUrl: pdfUrl,
  };
};

const payBooking = async ({ bookingId, payload, correlationId }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');
  if (!['hold', 'pending'].includes(found.record.status)) {
    throw ApiError.badRequest('Booking must be hold or pending to pay');
  }

  const gatewayReference = payload.gatewayReference || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const paymentDoc = {
    provider: payload.provider || 'manual',
    gatewayReference,
    amount: Number(payload.amount || found.record.amount?.total || found.record.totals?.total || found.record.amount || 0),
    currency: payload.currency || 'INR',
    status: 'initiated',
    metadata: { correlationId: payload.correlationId || correlationId || null },
  };

  if (found.type === 'hotel') paymentDoc.bookingId = found.record._id;
  if (found.type === 'shop') paymentDoc.orderId = found.record._id;
  if (found.type === 'tour') paymentDoc.reservationId = found.record._id;

  const transaction = await PaymentTransaction.create(paymentDoc);
  found.record.paymentStatus = 'processing';
  await found.record.save();
  return transaction;
};

const verifyPayment = async ({ txnId, statusOverride = null, correlationId }) => {
  const txn = await PaymentTransaction.findById(txnId);
  if (!txn) throw ApiError.notFound('Payment transaction not found');

  const status = resolveVerificationStatus(statusOverride, txn.status);
  if (status === 'processing') {
    return { state: 'processing', transaction: txn };
  }

  const found = await findAnyBookingById(txn.bookingId || txn.orderId || txn.reservationId);
  if (!found) throw ApiError.notFound('Linked booking not found');

  if (status === 'captured') {
    txn.status = 'captured';
    await txn.save();

    found.record.status = 'confirmed';
    found.record.paymentStatus = 'paid';
    await found.record.save();

    await appendPaymentLedger({
      sourceType: `${found.type}-booking`,
      sourceId: found.record._id,
      paymentReference: txn.gatewayReference,
      entries: [
        { account: 'cash', direction: 'debit', amount: txn.amount },
        { account: `${found.type}_revenue`, direction: 'credit', amount: txn.amount },
      ],
      metadata: { correlationId },
    });

    await enqueueJob('invoices', 'invoice-generation', { bookingId: String(found.record._id), type: found.type }, { correlationId });
    await enqueueJob('emails', 'booking-confirmation-email', { bookingId: String(found.record._id), type: found.type }, { correlationId });
    return { state: 'captured', booking: found.record, transaction: txn };
  }

  txn.status = 'failed';
  await txn.save();
  found.record.paymentStatus = 'failed';
  await found.record.save();
  return { state: 'failed', booking: found.record, transaction: txn };
};

const refundBooking = async ({ bookingId, reason, amount = null, correlationId }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');

  if (!['confirmed', 'checked_in', 'checked_out', 'completed'].includes(found.record.status)) {
    throw ApiError.badRequest('Booking state is not refundable');
  }

  const payment = await findPaymentByBookingEntity({ type: found.type, id: found.record._id });
  if (!payment) throw ApiError.badRequest('No payment found for booking');

  const refundAmount = Number(amount || payment.amount || 0);
  const refund = await createRefundForEntity({
    type: found.type,
    id: found.record._id,
    paymentTransactionId: payment._id,
    amount: refundAmount,
    reason,
  });

  await appendPaymentLedger({
    sourceType: `${found.type}-refund`,
    sourceId: found.record._id,
    paymentReference: `REFUND-${payment.gatewayReference}`,
    entries: [
      { account: `${found.type}_revenue`, direction: 'debit', amount: refundAmount },
      { account: 'cash', direction: 'credit', amount: refundAmount },
    ],
    metadata: { reason, correlationId },
  });

  found.record.refundStatus = 'refunded';
  found.record.paymentStatus = 'refunded';
  await found.record.save();

  await enqueueJob('notifications', 'refund-success-notification', { bookingId: String(found.record._id), type: found.type }, { correlationId });

  return { booking: found.record, refund };
};

const adminTransitionBooking = async ({ bookingId, toStatus, adminUser, note = null, correlationId }) => {
  const found = await findAnyBookingById(bookingId);
  if (!found) throw ApiError.notFound('Booking not found');

  const from = found.record.status;
  if (!isValidBookingTransition(from, toStatus)) {
    throw ApiError.badRequest(`Illegal transition from ${from} to ${toStatus}`);
  }

  const beforeSnapshot = found.record.toObject ? found.record.toObject() : { ...found.record };
  found.record.status = toStatus;
  found.record.adminNotes = [
    ...(found.record.adminNotes || []),
    { note, status: toStatus, by: adminUser.id, at: new Date() },
  ];
  found.record.transitionHistory = [
    ...(found.record.transitionHistory || []),
    { fromStatus: from, toStatus, changedBy: adminUser.id, changedAt: new Date(), note },
  ];
  await found.record.save();

  await recordAuditEvent({
    eventType: 'bookings.admin.transition',
    module: 'bookingHub',
    entityType: 'Booking',
    entityId: found.record._id,
    action: `admin-${toStatus}`,
    actor: { actorType: 'admin', actorId: adminUser.id, vendorId: found.record.vendorId || null },
    context: { correlationId, module: 'bookingHub' },
    beforeSnapshot,
    afterSnapshot: found.record.toObject ? found.record.toObject() : { ...found.record },
  });

  await enqueueJob('notifications', 'admin-booking-state-update-user', { bookingId: String(found.record._id), toStatus, type: found.type }, { correlationId });
  await enqueueJob('notifications', 'admin-booking-state-update-vendor', { bookingId: String(found.record._id), toStatus, type: found.type }, { correlationId });

  return found.record;
};

const adminManualRefund = async ({ bookingId, amount, reason, note = null, adminUser, correlationId }) => {
  const outcome = await refundBooking({ bookingId, reason, amount, correlationId });
  await recordAuditEvent({
    eventType: 'bookings.admin.manual_refund',
    module: 'bookingHub',
    entityType: 'Booking',
    entityId: outcome.booking._id,
    action: 'admin-manual-refund',
    actor: { actorType: 'admin', actorId: adminUser.id, vendorId: outcome.booking.vendorId || null },
    context: { correlationId, module: 'bookingHub' },
    metadata: { amount, reason, note },
  });
  return outcome;
};

const updateCartItem = async ({ productId, quantity, userId }) => {
  const cart = await findActiveCartWithItem(userId, productId);
  if (!cart) throw ApiError.notFound('Cart item not found');

  const product = await ProductItem.findById(productId).lean();
  if (!product || product.isDeleted || !product.isActive) throw ApiError.badRequest('Product unavailable');
  if (!product.isUnlimited && (product.stock || 0) < quantity) throw ApiError.badRequest('Insufficient stock');

  const nextItems = (cart.items || []).map((item) => {
    if (String(item.productId) !== String(productId)) return item;
    const unitPrice = item.unitPrice || product.discountedPrice || product.price;
    return { ...item.toObject(), quantity, totalPrice: Number((quantity * unitPrice).toFixed(2)) };
  });

  const subtotal = Number(nextItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));
  cart.items = nextItems;
  cart.totals = { ...(cart.totals || {}), subtotal, total: subtotal };
  await cart.save();
  return cart;
};

const deleteCartItem = async ({ productId, userId }) => {
  const cart = await findActiveCartWithItem(userId, productId);
  if (!cart) throw ApiError.notFound('Cart item not found');

  cart.items = (cart.items || []).filter((item) => String(item.productId) !== String(productId));
  const subtotal = Number(cart.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));
  cart.totals = { ...(cart.totals || {}), subtotal, total: subtotal };
  await cart.save();
  return cart;
};

const clearCart = async ({ userId, vendorId }) => {
  const cart = await findActiveCart(userId, vendorId);
  if (!cart) throw ApiError.notFound('Active cart not found');
  cart.items = [];
  cart.totals = { subtotal: 0, discount: 0, total: 0 };
  await cart.save();
  return cart;
};

const saveCheckoutAddress = async ({ userId, payload }) => {
  const cart = await findActiveCart(userId, payload.vendorId);
  if (!cart) throw ApiError.notFound('Active cart not found for vendor');
  cart.checkoutAddress = {
    name: payload.name,
    phone: payload.phone,
    line1: payload.line1,
    line2: payload.line2 || null,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    country: payload.country,
  };
  await cart.save();
  return cart;
};

const pushOrderTimeline = (order, status, note = null) => {
  order.timeline = [
    ...(order.timeline || []),
    { status, at: new Date(), note },
  ];
};

const cancelOrder = async ({ orderId, userId, reason, correlationId }) => {
  const order = await findOrderOwnedByUser(orderId, userId);
  if (!order) throw ApiError.notFound('Order not found');
  if (['cancelled', 'refunded', 'returned'].includes(order.status)) throw ApiError.badRequest('Order is already closed');

  order.status = 'cancelled';
  pushOrderTimeline(order, 'cancelled', reason || 'cancelled_by_user');
  await order.save();

  await enqueueJob('emails', 'order-status-email', { orderId: String(order._id), status: 'cancelled' }, { correlationId });
  return order;
};

const trackOrder = async ({ orderId, userId }) => {
  const order = await findOrderOwnedByUser(orderId, userId);
  if (!order) throw ApiError.notFound('Order not found');
  const shipment = await findShipmentByOrder(order._id);
  return {
    orderId: String(order._id),
    status: order.status,
    paymentStatus: order.paymentStatus,
    timeline: order.timeline || [],
    shipment,
  };
};

const returnOrder = async ({ orderId, userId, reason, correlationId }) => {
  const order = await findOrderOwnedByUser(orderId, userId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'delivered') throw ApiError.badRequest('Only delivered orders can be returned');

  order.status = 'return_requested';
  order.returnStatus = 'requested';
  pushOrderTimeline(order, 'return_requested', reason);
  await order.save();

  await enqueueJob('notifications', 'return-request-created', { orderId: String(order._id), reason }, { correlationId });
  await enqueueJob('emails', 'order-status-email', { orderId: String(order._id), status: 'return_requested' }, { correlationId });

  return order;
};

const getVendorDashboard = async ({ vendorId, userId }) => {
  const [counts, revenue] = await Promise.all([
    vendorDashboardCounts(vendorId, userId),
    getVendorRevenue(vendorId),
  ]);

  const slotExpiry = counts.slots.find((slot) => slot.endDate && new Date(slot.endDate) > new Date()) || null;
  const occupancy = computeOccupancyPercent(counts.activeRoomNights, counts.totalRoomNights);

  return {
    totalBookings: counts.totalBookings,
    todayBookings: counts.todayBookings,
    revenueTotal: Number(revenue.toFixed(2)),
    pendingPayouts: counts.pendingPayouts,
    cancellations: counts.cancellations,
    occupancyPercent: occupancy,
    activePlan: counts.activePlan?.planKey || 'free',
    slotExpiry: slotExpiry?.endDate || null,
    mediaCount: counts.mediaCount,
    unreadNotifications: counts.unreadNotifications,
  };
};

const getVendorBookings = async ({ vendorId, query }) => {
  const page = Number(query.page || 1);
  const perPage = Number(query.limit || query.perPage || 20);
  const skip = (page - 1) * perPage;

  const [hotels, sessions, orders] = await Promise.all([
    (await import('../../shared/models/HotelBooking.model.js')).default.find({ vendorId }).sort({ createdAt: -1 }).lean(),
    (await import('../../shared/models/SessionBooking.model.js')).default.find({ vendorId }).sort({ createdAt: -1 }).lean(),
    Order.find({ vendorId }).sort({ createdAt: -1 }).lean(),
  ]);

  const rows = [
    ...hotels.map((x) => normalizeBookingRecord('hotel', x)),
    ...sessions.map((x) => normalizeBookingRecord('kids', x)),
    ...orders.map((x) => normalizeBookingRecord('shop', x)),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    bookings: rows.slice(skip, skip + perPage),
    pagination: buildPaginationMeta(page, perPage, rows.length),
  };
};

const getVendorEarnings = async ({ vendorId }) => {
  const revenueTotal = await getVendorRevenue(vendorId);
  return { revenueTotal: Number(revenueTotal.toFixed(2)), currency: 'INR' };
};

const getVendorPayouts = async ({ vendorId }) => {
  const settlements = await (await import('../../shared/models/SettlementBatch.model.js')).default.find({ vendorId }).sort({ createdAt: -1 }).lean();
  return settlements;
};

const getVendorSubscription = async ({ vendorId }) => {
  return VendorSubscription.findOne({ vendorId }).sort({ createdAt: -1 }).lean();
};

const getVendorSlotStatus = async ({ vendorId }) => {
  const slots = await SlotAssignment.find({ vendorId }).sort({ endDate: 1 }).lean();
  const active = slots.filter((slot) => slot.status === 'assigned').length;
  const expired = slots.filter((slot) => slot.status === 'expired').length;
  return { active, expired, slots };
};

const deleteMedia = async ({ mediaId, user }) => {
  const media = await MediaAsset.findOne({ _id: mediaId, uploadedBy: user.id, isDeleted: false });
  if (!media) throw ApiError.notFound('Media not found');
  media.isDeleted = true;
  media.isActive = false;
  media.lifecycleStatus = 'deleted';
  media.deletedAt = new Date();
  await media.save();
  return media;
};

const replaceMedia = async ({ mediaId, payload, user }) => {
  const media = await MediaAsset.findOne({ _id: mediaId, uploadedBy: user.id, isDeleted: false });
  if (!media) throw ApiError.notFound('Media not found');

  media.replacementHistory = [
    ...(media.replacementHistory || []),
    {
      previousPublicId: media.publicId,
      previousUrl: media.url,
      replacedAt: new Date(),
      replacedBy: user.id,
    },
  ];
  media.publicId = payload.publicId;
  media.url = payload.url;
  if (payload.checksum) media.checksum = payload.checksum;
  if (payload.altText !== undefined) media.altText = payload.altText;
  await media.save();
  return media;
};

const reorderMedia = async ({ listingId, orderedMediaIds, user }) => {
  const normalizedIds = normalizeOrderedMediaIds(orderedMediaIds);
  const mediaDocs = await MediaAsset.find({ _id: { $in: normalizedIds }, listingId, uploadedBy: user.id, isDeleted: false });
  if (mediaDocs.length !== normalizedIds.length) throw ApiError.badRequest('One or more media assets are invalid');

  const mediaById = new Map(mediaDocs.map((doc) => [String(doc._id), doc]));
  const orderedMedia = [];

  for (let index = 0; index < normalizedIds.length; index += 1) {
    const id = String(normalizedIds[index]);
    const doc = mediaById.get(id);
    doc.order = index;
    orderedMedia.push(doc);
  }

  await Promise.all(orderedMedia.map((doc) => doc.save()));
  await reorderListingGallery({ listingId, orderedMedia });
  return orderedMedia;
};

const setPrimaryMedia = async ({ mediaId, listingId, user }) => {
  const media = await MediaAsset.findOne({ _id: mediaId, uploadedBy: user.id, isDeleted: false });
  if (!media) throw ApiError.notFound('Media not found');

  const targetListingId = listingId || media.listingId;
  if (targetListingId) {
    await MediaAsset.updateMany(
      { listingId: targetListingId, uploadedBy: user.id, isDeleted: false },
      { $set: { isPrimary: false } }
    );
  }

  media.isPrimary = true;
  media.role = 'cover';
  await media.save();

  if (targetListingId) {
    await ListingBase.findByIdAndUpdate(targetListingId, {
      coverImage: { publicId: media.publicId, url: media.url, altText: media.altText || '' },
    });
  }

  return media;
};

const restoreMedia = async ({ mediaId, user }) => {
  const media = await MediaAsset.findOne({ _id: mediaId, uploadedBy: user.id, isDeleted: true });
  if (!media) throw ApiError.notFound('Deleted media not found');
  media.isDeleted = false;
  media.isActive = true;
  media.lifecycleStatus = 'active';
  media.deletedAt = null;
  await media.save();
  return media;
};

export {
  normalizeBookingRecord,
  filterBookingRows,
  resolveVerificationStatus,
  computeOccupancyPercent,
  normalizeOrderedMediaIds,
  getMyBookings,
  getAdminBookings,
  getAdminBookingTimeline,
  cancelMyBooking,
  rescheduleMyBooking,
  getInvoiceForBooking,
  payBooking,
  verifyPayment,
  refundBooking,
  adminTransitionBooking,
  adminManualRefund,
  updateCartItem,
  deleteCartItem,
  clearCart,
  saveCheckoutAddress,
  cancelOrder,
  trackOrder,
  returnOrder,
  getVendorDashboard,
  getVendorBookings,
  getVendorEarnings,
  getVendorPayouts,
  getVendorSubscription,
  getVendorSlotStatus,
  deleteMedia,
  replaceMedia,
  reorderMedia,
  setPrimaryMedia,
  restoreMedia,
};
