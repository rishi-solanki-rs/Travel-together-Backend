import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import SubscriptionPlan from '../../shared/models/SubscriptionPlan.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { SUBSCRIPTION_STATUS } from '../../shared/constants/index.js';

const createSubscription = async (vendorId, { planId, billingCycle }) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw ApiError.notFound('Plan not found');

  const amount = plan.pricing[billingCycle];
  if (!amount && amount !== 0) throw ApiError.badRequest('Invalid billing cycle for this plan');

  const existingActive = await VendorSubscription.findOne({ vendorId, status: SUBSCRIPTION_STATUS.ACTIVE });
  if (existingActive) throw ApiError.conflict('Vendor already has an active subscription');

  const subscription = await VendorSubscription.create({
    vendorId,
    planId,
    planKey: plan.key,
    billingCycle,
    amount,
    status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
    features: plan.features,
    limits: plan.limits,
  });

  return subscription;
};

const activateSubscription = async (subscriptionId, paymentData, adminId) => {
  const sub = await VendorSubscription.findById(subscriptionId);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const now = new Date();
  const billingDays = { monthly: 30, quarterly: 90, halfYearly: 180, annual: 365 };
  const days = billingDays[sub.billingCycle] || 30;
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  sub.status = SUBSCRIPTION_STATUS.ACTIVE;
  sub.paymentStatus = 'paid';
  sub.startDate = now;
  sub.endDate = endDate;
  sub.nextBillingDate = endDate;
  sub.paymentReference = paymentData.reference;
  sub.paymentGateway = paymentData.gateway;
  sub.approvedBy = adminId;
  sub.approvedAt = now;
  await sub.save();

  await Vendor.findByIdAndUpdate(sub.vendorId, {
    activeSubscriptionId: sub._id,
    currentPlan: sub.planKey,
  });

  return sub;
};

const getVendorSubscriptions = async (vendorId) => {
  return VendorSubscription.find({ vendorId })
    .populate('planId', 'name displayName color')
    .sort({ createdAt: -1 });
};

const cancelSubscription = async (subscriptionId, vendorId, reason) => {
  const sub = await VendorSubscription.findOneAndUpdate(
    { _id: subscriptionId, vendorId, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.CANCELLED, cancelledAt: new Date(), cancellationReason: reason, autoRenew: false },
    { new: true }
  );
  if (!sub) throw ApiError.notFound('Active subscription not found');
  return sub;
};

const getAllSubscriptions = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.planKey) filter.planKey = query.planKey;
  if (query.vendorId) filter.vendorId = query.vendorId;

  const [subs, total] = await Promise.all([
    VendorSubscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage)
      .populate('vendorId', 'businessName').populate('planId', 'name displayName'),
    VendorSubscription.countDocuments(filter),
  ]);

  return { subscriptions: subs, pagination: buildPaginationMeta(page, perPage, total) };
};

export { createSubscription, activateSubscription, getVendorSubscriptions, cancelSubscription, getAllSubscriptions };
