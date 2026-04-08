import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  upsertCart,
  checkoutCart,
  updateOrderStatus,
  getVendorSalesDashboard,
} from './shops.commerce.service.js';

const upsertCartController = asyncHandler(async (req, res) => {
  const cart = await upsertCart({
    vendorId: req.user.vendorId || req.body.vendorId,
    userId: req.user.id,
    items: req.body.items || [],
    couponCode: req.body.couponCode || null,
  });
  ApiResponse.success(res, 'Cart updated', cart);
});

const checkoutController = asyncHandler(async (req, res) => {
  const order = await checkoutCart({
    vendorId: req.user.vendorId || req.body.vendorId,
    userId: req.user.id,
    checkoutToken: req.body.checkoutToken,
    payment: req.body.payment || {},
  });
  ApiResponse.created(res, 'Order placed', order);
});

const updateOrderStatusController = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus({ orderId: req.params.orderId, vendorId: req.user.vendorId, status: req.body.status });
  ApiResponse.success(res, 'Order status updated', order);
});

const vendorSalesDashboardController = asyncHandler(async (req, res) => {
  const dashboard = await getVendorSalesDashboard(req.user.vendorId);
  ApiResponse.success(res, 'Vendor sales dashboard fetched', dashboard);
});

export { upsertCartController, checkoutController, updateOrderStatusController, vendorSalesDashboardController };
