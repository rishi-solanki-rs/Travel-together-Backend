import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
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
} from './bookingHub.service.js';

const myBookings = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await getMyBookings(req.user.id, req.query);
  ApiResponse.paginated(res, 'Bookings fetched', bookings, pagination);
});

const adminBookingsController = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await getAdminBookings(req.query);
  ApiResponse.paginated(res, 'Admin bookings fetched', bookings, pagination);
});

const adminBookingTimelineController = asyncHandler(async (req, res) => {
  const timeline = await getAdminBookingTimeline(req.query);
  ApiResponse.success(res, 'Admin booking timeline fetched', timeline, timeline.pagination);
});

const cancelMyBookingController = asyncHandler(async (req, res) => {
  const booking = await cancelMyBooking({
    bookingId: req.params.id,
    reason: req.body.reason,
    refundAmount: req.body.refundAmount,
    user: req.user,
    correlationId: req.correlationId,
  });
  ApiResponse.success(res, 'Booking cancelled', booking);
});

const rescheduleMyBookingController = asyncHandler(async (req, res) => {
  const booking = await rescheduleMyBooking({
    bookingId: req.params.id,
    newDate: req.body.newDate,
    checkOutDate: req.body.checkOutDate,
    notes: req.body.notes,
    user: req.user,
    correlationId: req.correlationId,
  });
  ApiResponse.success(res, 'Booking rescheduled', booking);
});

const bookingInvoice = asyncHandler(async (req, res) => {
  const invoice = await getInvoiceForBooking({ bookingId: req.params.id, user: req.user });
  ApiResponse.success(res, 'Invoice state fetched', invoice);
});

const payBookingController = asyncHandler(async (req, res) => {
  const txn = await payBooking({ bookingId: req.params.id, payload: req.body, correlationId: req.correlationId });
  ApiResponse.created(res, 'Payment transaction created', txn);
});

const verifyPaymentController = asyncHandler(async (req, res) => {
  const result = await verifyPayment({ txnId: req.params.txnId, statusOverride: req.body.status, correlationId: req.correlationId });
  ApiResponse.success(res, 'Payment verification processed', result);
});

const refundBookingController = asyncHandler(async (req, res) => {
  const result = await refundBooking({ bookingId: req.params.id, reason: req.body.reason, amount: req.body.amount, correlationId: req.correlationId });
  ApiResponse.success(res, 'Refund created', result);
});

const adminTransition = (status, message) => asyncHandler(async (req, res) => {
  const booking = await adminTransitionBooking({
    bookingId: req.params.id,
    toStatus: status,
    note: req.body.note,
    adminUser: req.user,
    correlationId: req.correlationId,
  });
  ApiResponse.success(res, message, booking);
});

const adminManualRefundController = asyncHandler(async (req, res) => {
  const result = await adminManualRefund({
    bookingId: req.params.id,
    amount: req.body.amount,
    reason: req.body.reason,
    note: req.body.note,
    adminUser: req.user,
    correlationId: req.correlationId,
  });
  ApiResponse.success(res, 'Manual refund completed', result);
});

const updateCartItemController = asyncHandler(async (req, res) => {
  const cart = await updateCartItem({ productId: req.params.id, quantity: req.body.quantity, userId: req.user.id });
  ApiResponse.success(res, 'Cart item updated', cart);
});

const deleteCartItemController = asyncHandler(async (req, res) => {
  const cart = await deleteCartItem({ productId: req.params.id, userId: req.user.id });
  ApiResponse.success(res, 'Cart item removed', cart);
});

const clearCartController = asyncHandler(async (req, res) => {
  const cart = await clearCart({ userId: req.user.id, vendorId: req.body.vendorId });
  ApiResponse.success(res, 'Cart cleared', cart);
});

const checkoutAddressController = asyncHandler(async (req, res) => {
  const cart = await saveCheckoutAddress({ userId: req.user.id, payload: req.body });
  ApiResponse.success(res, 'Checkout address saved', cart);
});

const cancelOrderController = asyncHandler(async (req, res) => {
  const order = await cancelOrder({ orderId: req.params.id, userId: req.user.id, reason: req.body.reason, correlationId: req.correlationId });
  ApiResponse.success(res, 'Order cancelled', order);
});

const trackOrderController = asyncHandler(async (req, res) => {
  const tracking = await trackOrder({ orderId: req.params.id, userId: req.user.id });
  ApiResponse.success(res, 'Order tracking fetched', tracking);
});

const returnOrderController = asyncHandler(async (req, res) => {
  const order = await returnOrder({ orderId: req.params.id, userId: req.user.id, reason: req.body.reason, correlationId: req.correlationId });
  ApiResponse.success(res, 'Return request created', order);
});

const vendorDashboardController = asyncHandler(async (req, res) => {
  const dashboard = await getVendorDashboard({ vendorId: req.user.vendorId, userId: req.user.id });
  ApiResponse.success(res, 'Vendor dashboard fetched', dashboard);
});

const vendorBookingsController = asyncHandler(async (req, res) => {
  const result = await getVendorBookings({ vendorId: req.user.vendorId, query: req.query });
  ApiResponse.paginated(res, 'Vendor bookings fetched', result.bookings, result.pagination);
});

const vendorEarningsController = asyncHandler(async (req, res) => {
  const data = await getVendorEarnings({ vendorId: req.user.vendorId });
  ApiResponse.success(res, 'Vendor earnings fetched', data);
});

const vendorPayoutsController = asyncHandler(async (req, res) => {
  const data = await getVendorPayouts({ vendorId: req.user.vendorId });
  ApiResponse.success(res, 'Vendor payouts fetched', data);
});

const vendorSubscriptionController = asyncHandler(async (req, res) => {
  const data = await getVendorSubscription({ vendorId: req.user.vendorId });
  ApiResponse.success(res, 'Vendor subscription fetched', data);
});

const vendorSlotStatusController = asyncHandler(async (req, res) => {
  const data = await getVendorSlotStatus({ vendorId: req.user.vendorId });
  ApiResponse.success(res, 'Vendor slot status fetched', data);
});

const mediaDeleteController = asyncHandler(async (req, res) => {
  const data = await deleteMedia({ mediaId: req.params.id, user: req.user });
  ApiResponse.success(res, 'Media deleted', data);
});

const mediaReplaceController = asyncHandler(async (req, res) => {
  const data = await replaceMedia({ mediaId: req.params.id, payload: req.body, user: req.user });
  ApiResponse.success(res, 'Media replaced', data);
});

const mediaReorderController = asyncHandler(async (req, res) => {
  const data = await reorderMedia({ listingId: req.body.listingId, orderedMediaIds: req.body.orderedMediaIds, user: req.user });
  ApiResponse.success(res, 'Media reordered', data);
});

const mediaPrimaryController = asyncHandler(async (req, res) => {
  const data = await setPrimaryMedia({ mediaId: req.params.id, listingId: req.body.listingId, user: req.user });
  ApiResponse.success(res, 'Primary media updated', data);
});

const mediaRestoreController = asyncHandler(async (req, res) => {
  const data = await restoreMedia({ mediaId: req.params.id, user: req.user });
  ApiResponse.success(res, 'Media restored', data);
});

export {
  myBookings,
  adminBookingsController,
  adminBookingTimelineController,
  cancelMyBookingController,
  rescheduleMyBookingController,
  bookingInvoice,
  payBookingController,
  verifyPaymentController,
  refundBookingController,
  adminTransition,
  adminManualRefundController,
  updateCartItemController,
  deleteCartItemController,
  clearCartController,
  checkoutAddressController,
  cancelOrderController,
  trackOrderController,
  returnOrderController,
  vendorDashboardController,
  vendorBookingsController,
  vendorEarningsController,
  vendorPayoutsController,
  vendorSubscriptionController,
  vendorSlotStatusController,
  mediaDeleteController,
  mediaReplaceController,
  mediaReorderController,
  mediaPrimaryController,
  mediaRestoreController,
};
