import HotelBooking from '../../shared/models/HotelBooking.model.js';
import SessionBooking from '../../shared/models/SessionBooking.model.js';
import GuardianProfile from '../../shared/models/GuardianProfile.model.js';
import Order from '../../shared/models/Order.model.js';
import TourReservation from '../../shared/models/TourReservation.model.js';
import PaymentTransaction from '../../shared/models/PaymentTransaction.model.js';
import Refund from '../../shared/models/Refund.model.js';
import Invoice from '../../shared/models/Invoice.model.js';
import Cart from '../../shared/models/Cart.model.js';
import ProductItem from '../../shared/models/ProductItem.model.js';
import Shipment from '../../shared/models/Shipment.model.js';
import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import SettlementBatch from '../../shared/models/SettlementBatch.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import Notification from '../../shared/models/Notification.model.js';

const findUserHotels = (userId) => HotelBooking.find({ bookedByUserId: userId }).lean();

const findUserSessionBookings = async (userId) => {
  const guardians = await GuardianProfile.find({ userId }).select('_id').lean();
  const guardianIds = guardians.map((g) => g._id);
  if (!guardianIds.length) return [];
  return SessionBooking.find({ guardianProfileId: { $in: guardianIds } }).lean();
};

const findUserOrders = (userId) => Order.find({ userId }).lean();
const findUserTours = (userId) => TourReservation.find({ reservedByUserId: userId }).lean();

const findInvoiceByEntity = (entity) => {
  if (entity.type === 'hotel') return Invoice.findOne({ bookingId: entity.id }).lean();
  if (entity.type === 'shop') return Invoice.findOne({ orderId: entity.id }).lean();
  if (entity.type === 'tour') return Invoice.findOne({ reservationId: entity.id }).lean();
  return Promise.resolve(null);
};

const findAnyBookingById = async (id) => {
  const [hotel, session, order, tour] = await Promise.all([
    HotelBooking.findById(id),
    SessionBooking.findById(id),
    Order.findById(id),
    TourReservation.findById(id),
  ]);
  if (hotel) return { type: 'hotel', record: hotel };
  if (session) return { type: 'kids', record: session };
  if (order) return { type: 'shop', record: order };
  if (tour) return { type: 'tour', record: tour };
  return null;
};

const findPaymentByBookingEntity = ({ type, id }) => {
  if (type === 'hotel') return PaymentTransaction.findOne({ bookingId: id }).sort({ createdAt: -1 });
  if (type === 'shop') return PaymentTransaction.findOne({ orderId: id }).sort({ createdAt: -1 });
  if (type === 'tour') return PaymentTransaction.findOne({ reservationId: id }).sort({ createdAt: -1 });
  return Promise.resolve(null);
};

const createRefundForEntity = ({ type, id, paymentTransactionId, amount, reason }) => {
  const payload = { amount, reason, paymentTransactionId, status: 'processed' };
  if (type === 'hotel') payload.bookingId = id;
  if (type === 'shop') payload.orderId = id;
  if (type === 'tour') payload.reservationId = id;
  return Refund.create(payload);
};

const findActiveCartWithItem = (userId, productId) => Cart.findOne({ userId, status: 'active', 'items.productId': productId });
const findActiveCart = (userId, vendorId) => Cart.findOne({ userId, vendorId, status: 'active' });
const findOrderOwnedByUser = (orderId, userId) => Order.findOne({ _id: orderId, userId });
const findShipmentByOrder = (orderId) => Shipment.findOne({ orderId }).lean();

const vendorDashboardCounts = async (vendorId, userId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    hotelCount,
    sessionCount,
    orderCount,
    todayHotel,
    todaySession,
    todayOrder,
    cancellations,
    mediaCount,
    unread,
    activePlan,
    pendingPayout,
    slots,
    activeRoomNights,
    totalRoomNights,
  ] = await Promise.all([
    HotelBooking.countDocuments({ vendorId }),
    SessionBooking.countDocuments({ vendorId }),
    Order.countDocuments({ vendorId }),
    HotelBooking.countDocuments({ vendorId, createdAt: { $gte: todayStart } }),
    SessionBooking.countDocuments({ vendorId, createdAt: { $gte: todayStart } }),
    Order.countDocuments({ vendorId, createdAt: { $gte: todayStart } }),
    HotelBooking.countDocuments({ vendorId, status: { $in: ['cancelled', 'refunded'] } }),
    MediaAsset.countDocuments({ vendorId, isDeleted: false }),
    Notification.countDocuments({ userId, isDeleted: false, isRead: false }),
    VendorSubscription.findOne({ vendorId, status: 'active' }).sort({ endDate: -1 }).lean(),
    SettlementBatch.aggregate([
      { $match: { vendorId, status: 'pending' } },
      { $group: { _id: null, amount: { $sum: '$netAmount' } } },
    ]),
    SlotAssignment.find({ vendorId }).sort({ endDate: 1 }).lean(),
    HotelBooking.aggregate([
      { $match: { vendorId, status: { $in: ['confirmed', 'checked_in', 'checked_out'] } } },
      { $group: { _id: null, nights: { $sum: '$nights' }, rooms: { $sum: '$roomsBooked' } } },
    ]),
    HotelBooking.aggregate([
      { $match: { vendorId } },
      { $group: { _id: null, nights: { $sum: '$nights' }, rooms: { $sum: '$roomsBooked' } } },
    ]),
  ]);

  return {
    totalBookings: hotelCount + sessionCount + orderCount,
    todayBookings: todayHotel + todaySession + todayOrder,
    cancellations,
    mediaCount,
    unreadNotifications: unread,
    activePlan,
    pendingPayouts: pendingPayout[0]?.amount || 0,
    slots,
    activeRoomNights: (activeRoomNights[0]?.nights || 0) * Math.max(activeRoomNights[0]?.rooms || 1, 1),
    totalRoomNights: (totalRoomNights[0]?.nights || 0) * Math.max(totalRoomNights[0]?.rooms || 1, 1),
  };
};

const getVendorRevenue = async (vendorId) => {
  const [hotelRevenue, orderRevenue, tourRevenue] = await Promise.all([
    HotelBooking.aggregate([{ $match: { vendorId, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount.total' } } }]),
    Order.aggregate([{ $match: { vendorId, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }]),
    TourReservation.aggregate([{ $match: { vendorId, status: { $in: ['confirmed', 'completed'] } } }, { $group: { _id: null, total: { $sum: '$amount.total' } } }]),
  ]);
  return (hotelRevenue[0]?.total || 0) + (orderRevenue[0]?.total || 0) + (tourRevenue[0]?.total || 0);
};

const reorderListingGallery = async ({ listingId, orderedMedia }) => {
  const galleryImages = orderedMedia.map((media, index) => ({
    publicId: media.publicId,
    url: media.url,
    altText: media.altText || '',
    order: index,
    role: media.role || 'gallery',
  }));
  return ListingBase.findByIdAndUpdate(listingId, { galleryImages }, { new: true });
};

export {
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
};
