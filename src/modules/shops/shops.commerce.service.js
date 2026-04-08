import Cart from '../../shared/models/Cart.model.js';
import Order from '../../shared/models/Order.model.js';
import OrderItem from '../../shared/models/OrderItem.model.js';
import Shipment from '../../shared/models/Shipment.model.js';
import Coupon from '../../shared/models/Coupon.model.js';
import InventoryLedger from '../../shared/models/InventoryLedger.model.js';
import ProductItem from '../../shared/models/ProductItem.model.js';
import PaymentTransaction from '../../shared/models/PaymentTransaction.model.js';
import ApiError from '../../utils/ApiError.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { appendPaymentLedger } from '../../operations/finance/reconciliation.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';

const buildOrderNumber = () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const calculateCouponDiscount = ({ subtotal, coupon }) => {
  if (!coupon) return 0;
  if (subtotal < (coupon.minimumOrderValue || 0)) return 0;
  let discount = 0;
  if (coupon.type === 'percent') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  return Number(Math.max(0, discount).toFixed(2));
};

const computeCartTotals = ({ items = [], coupon = null }) => {
  const subtotal = Number(items.reduce((acc, item) => acc + (item.totalPrice || 0), 0).toFixed(2));
  const discount = calculateCouponDiscount({ subtotal, coupon });
  const total = Number(Math.max(0, subtotal - discount).toFixed(2));
  return { subtotal, discount, total };
};

const upsertCart = async ({ vendorId, userId, items = [], couponCode = null }) => {
  const productIds = items.map((item) => item.productId);
  const products = await ProductItem.find({ _id: { $in: productIds }, vendorId, isDeleted: false, isActive: true }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = items.map((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) throw ApiError.badRequest('Invalid product in cart');
    const unitPrice = product.discountedPrice || product.price;
    const quantity = Number(item.quantity || 1);
    return {
      productId: item.productId,
      quantity,
      unitPrice,
      totalPrice: Number((unitPrice * quantity).toFixed(2)),
    };
  });

  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ vendorId, code: couponCode, isActive: true }).lean();
  }

  const totals = computeCartTotals({ items: normalizedItems, coupon });

  const cart = await Cart.findOneAndUpdate(
    { vendorId, userId, status: 'active' },
    {
      $set: {
        items: normalizedItems,
        couponCode: coupon?.code || null,
        totals,
      },
    },
    { new: true, upsert: true }
  );
  return cart;
};

const checkoutCart = async ({ vendorId, userId, checkoutToken, payment = {} }) => withTransaction(async ({ session }) => {
  const existingOrder = await Order.findOne({ checkoutToken }).session(session);
  if (existingOrder) return existingOrder;

  const cart = await Cart.findOne({ vendorId, userId, status: 'active' }).session(session);
  if (!cart || !cart.items?.length) throw ApiError.badRequest('Active cart not found');

  const orderItemsPayload = [];
  for (const item of cart.items) {
    const product = await ProductItem.findOneAndUpdate(
      {
        _id: item.productId,
        vendorId,
        isDeleted: false,
        isActive: true,
        $or: [
          { isUnlimited: true },
          { stock: { $gte: item.quantity } },
        ],
      },
      {
        $inc: item.quantity ? { stock: item.quantity * -1 } : {},
        $set: {
          isInStock: true,
        },
      },
      { session, new: true }
    );
    if (!product) throw ApiError.badRequest('Stock unavailable for one or more items');

    if (!product.isUnlimited && product.stock < 0) {
      throw ApiError.badRequest('Concurrent checkout caused stock underflow');
    }

    const normalizedStock = product.isUnlimited ? product.stock : Math.max(product.stock, 0);
    if (!product.isUnlimited && normalizedStock !== product.stock) {
      product.stock = normalizedStock;
      product.isInStock = normalizedStock > 0;
      await product.save({ session });
    } else if (!product.isUnlimited && product.stock === 0) {
      await ProductItem.findByIdAndUpdate(product._id, { isInStock: false }, { session });
    }

    orderItemsPayload.push({
      productId: product._id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.totalPrice,
      skuSnapshot: product.sku || null,
      titleSnapshot: product.name,
    });
  }

  const [order] = await Order.create([{
    orderNumber: buildOrderNumber(),
    vendorId,
    userId,
    cartId: cart._id,
    checkoutToken,
    status: 'confirmed',
    paymentStatus: 'paid',
    totals: {
      subtotal: cart.totals.subtotal,
      discount: cart.totals.discount,
      total: cart.totals.total,
      currency: 'INR',
    },
  }], { session });

  await OrderItem.insertMany(orderItemsPayload.map((item) => ({ ...item, orderId: order._id })), { session });

  const stockDocs = await ProductItem.find({ _id: { $in: orderItemsPayload.map((item) => item.productId) } }).session(session).lean();
  const stockMap = new Map(stockDocs.map((doc) => [String(doc._id), doc]));

  await InventoryLedger.insertMany(orderItemsPayload.map((item) => ({
    productId: item.productId,
    orderId: order._id,
    delta: item.quantity * -1,
    reason: 'order',
    balanceAfter: stockMap.get(String(item.productId))?.stock ?? 0,
  })), { session });

  await Shipment.create([{ orderId: order._id, vendorId, status: 'created' }], { session });

  await PaymentTransaction.create([{
    orderId: order._id,
    provider: payment.provider || 'manual',
    gatewayReference: payment.gatewayReference || `SHOPPAY-${order.orderNumber}`,
    amount: order.totals.total,
    currency: order.totals.currency,
    status: 'captured',
  }], { session });

  await appendPaymentLedger({
    sourceType: 'shop-order',
    sourceId: order._id,
    paymentReference: `SHOPPAY-${order.orderNumber}`,
    entries: [
      { account: 'cash', direction: 'debit', amount: order.totals.total },
      { account: 'shop_revenue', direction: 'credit', amount: order.totals.total },
    ],
    metadata: { vendorId, orderNumber: order.orderNumber },
  });

  await recordAuditEvent({
    eventType: 'shops.checkout.completed',
    module: 'shops',
    entityType: 'Order',
    entityId: order._id,
    action: 'checkout-cart',
    actor: { actorType: 'user', actorId: userId, vendorId },
    afterSnapshot: { status: order.status, paymentStatus: order.paymentStatus, total: order.totals.total },
  });
  await recordFinancialLedgerEvent({
    domain: 'shops',
    entityType: 'Order',
    entityId: order._id,
    eventType: 'order-confirmed',
    amount: order.totals.total,
    metadata: { vendorId, orderNumber: order.orderNumber },
  });
  await enqueueJob('notifications', 'shop-order-confirmed', { orderId: String(order._id), vendorId: String(vendorId), userId: String(userId || '') });
  await enqueueJob('emails', 'shop-order-receipt', { orderId: String(order._id), vendorId: String(vendorId), userId: String(userId || '') });
  await enqueueJob('payouts', 'shop-order-payout-ready', { orderId: String(order._id), vendorId: String(vendorId), amount: order.totals.total });
  await recordFinancialLedgerEvent({
    domain: 'payouts',
    entityType: 'Order',
    entityId: order._id,
    eventType: 'payout-ready',
    amount: order.totals.total,
    metadata: { vendorId, orderNumber: order.orderNumber },
  });

  cart.status = 'checked_out';
  await cart.save({ session });

  return order;
});

const updateOrderStatus = async ({ orderId, vendorId, status }) => {
  const order = await Order.findOneAndUpdate({ _id: orderId, vendorId }, { status }, { new: true });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
};

const getVendorSalesDashboard = async (vendorId) => {
  const [orderCounts, revenue] = await Promise.all([
    Order.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { vendorId, paymentStatus: 'paid' } },
      { $group: { _id: null, gross: { $sum: '$totals.total' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    orderStatus: orderCounts,
    revenue: revenue[0] || { gross: 0, count: 0 },
  };
};

const preventDuplicateCheckout = (tokenSet, checkoutToken) => {
  if (tokenSet.has(checkoutToken)) {
    incrementCounter('tii_duplicate_checkout_total', 1, { source: 'shops' });
    return false;
  }
  tokenSet.add(checkoutToken);
  return true;
};

const applyConcurrentStockDecrements = ({ stock, requests }) => {
  let remaining = stock;
  let success = 0;
  for (const qty of requests) {
    if (remaining >= qty) {
      remaining -= qty;
      success += 1;
    }
  }
  return { remaining, success };
};

export {
  calculateCouponDiscount,
  computeCartTotals,
  preventDuplicateCheckout,
  applyConcurrentStockDecrements,
  upsertCart,
  checkoutCart,
  updateOrderStatus,
  getVendorSalesDashboard,
};
