import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin, isSuperAdmin, isVendorAdmin } from '../../middlewares/authorize.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
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
} from './bookingHub.controller.js';
import {
  myBookingsQuerySchema,
  adminBookingsQuerySchema,
  adminBookingTimelineQuerySchema,
  bookingIdParamsSchema,
  txnIdParamsSchema,
  mediaIdParamsSchema,
  orderIdParamsSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  payBookingSchema,
  verifyPaymentSchema,
  refundBookingSchema,
  adminTransitionSchema,
  manualRefundSchema,
  cartItemUpdateSchema,
  checkoutAddressSchema,
  orderReturnSchema,
  mediaReplaceSchema,
  mediaReorderSchema,
  mediaPrimarySchema,
} from './bookingHub.validator.js';

const router = express.Router();

router.get('/my/bookings', authenticate, validateRequest({ query: myBookingsQuerySchema }), myBookings);
router.patch('/my/bookings/:id/cancel', authenticate, validateRequest({ params: bookingIdParamsSchema, body: cancelBookingSchema }), cancelMyBookingController);
router.patch('/my/bookings/:id/reschedule', authenticate, validateRequest({ params: bookingIdParamsSchema, body: rescheduleBookingSchema }), rescheduleMyBookingController);
router.get('/my/bookings/:id/invoice', authenticate, validateRequest({ params: bookingIdParamsSchema }), bookingInvoice);

router.get('/admin/bookings', authenticate, isSuperAdmin, validateRequest({ query: adminBookingsQuerySchema }), adminBookingsController);
router.get('/admin/bookings/timeline', authenticate, isSuperAdmin, validateRequest({ query: adminBookingTimelineQuerySchema }), adminBookingTimelineController);

router.post('/bookings/:id/pay', authenticate, validateRequest({ params: bookingIdParamsSchema, body: payBookingSchema }), payBookingController);
router.post('/payments/:txnId/verify', authenticate, validateRequest({ params: txnIdParamsSchema, body: verifyPaymentSchema }), verifyPaymentController);
router.post('/bookings/:id/refund', authenticate, validateRequest({ params: bookingIdParamsSchema, body: refundBookingSchema }), refundBookingController);

router.patch('/admin/bookings/:id/approve', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: adminTransitionSchema }), adminTransition('confirmed', 'Booking approved'));
router.patch('/admin/bookings/:id/reject', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: adminTransitionSchema }), adminTransition('cancelled', 'Booking rejected'));
router.patch('/admin/bookings/:id/checkin', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: adminTransitionSchema }), adminTransition('checked_in', 'Booking checked-in'));
router.patch('/admin/bookings/:id/complete', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: adminTransitionSchema }), adminTransition('completed', 'Booking completed'));
router.patch('/admin/bookings/:id/no-show', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: adminTransitionSchema }), adminTransition('no_show', 'Booking marked no-show'));
router.post('/admin/bookings/:id/manual-refund', authenticate, isAdmin, validateRequest({ params: bookingIdParamsSchema, body: manualRefundSchema }), adminManualRefundController);

router.patch('/cart/item/:id', authenticate, validateRequest({ params: orderIdParamsSchema, body: cartItemUpdateSchema }), updateCartItemController);
router.delete('/cart/item/:id', authenticate, validateRequest({ params: orderIdParamsSchema }), deleteCartItemController);
router.delete('/cart/clear', authenticate, clearCartController);
router.post('/checkout/address', authenticate, validateRequest({ body: checkoutAddressSchema }), checkoutAddressController);
router.post('/orders/:id/cancel', authenticate, validateRequest({ params: orderIdParamsSchema, body: refundBookingSchema }), cancelOrderController);
router.get('/orders/:id/track', authenticate, validateRequest({ params: orderIdParamsSchema }), trackOrderController);
router.post('/orders/:id/return', authenticate, validateRequest({ params: orderIdParamsSchema, body: orderReturnSchema }), returnOrderController);

router.get('/vendor/dashboard', authenticate, isVendorAdmin, vendorDashboardController);
router.get('/vendor/bookings', authenticate, isVendorAdmin, vendorBookingsController);
router.get('/vendor/earnings', authenticate, isVendorAdmin, vendorEarningsController);
router.get('/vendor/payouts', authenticate, isVendorAdmin, vendorPayoutsController);
router.get('/vendor/subscription', authenticate, isVendorAdmin, vendorSubscriptionController);
router.get('/vendor/slot-status', authenticate, isVendorAdmin, vendorSlotStatusController);

router.delete('/media/:id', authenticate, validateRequest({ params: mediaIdParamsSchema }), mediaDeleteController);
router.patch('/media/:id/replace', authenticate, validateRequest({ params: mediaIdParamsSchema, body: mediaReplaceSchema }), mediaReplaceController);
router.patch('/media/reorder', authenticate, validateRequest({ body: mediaReorderSchema }), mediaReorderController);
router.patch('/media/:id/primary', authenticate, validateRequest({ params: mediaIdParamsSchema, body: mediaPrimarySchema }), mediaPrimaryController);
router.post('/media/:id/restore', authenticate, validateRequest({ params: mediaIdParamsSchema }), mediaRestoreController);

export default router;
