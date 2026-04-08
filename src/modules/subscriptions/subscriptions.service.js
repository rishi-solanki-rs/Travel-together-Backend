import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import SubscriptionPlan from '../../shared/models/SubscriptionPlan.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { SUBSCRIPTION_STATUS } from '../../shared/constants/index.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { revokeAssignmentsBySubscription, detectSubscriptionSlotMismatches } from '../slots/slots.service.js';
import { syncVendorEntitlement } from '../vendors/vendors.service.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';

const isSameObjectId = (left, right) => {
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

const syncVendorPlanInvariant = async (vendorId, activeSubscriptionId, currentPlan, session) => {
  return syncVendorEntitlement(vendorId, { activeSubscriptionId, currentPlan }, session);
};

const createSubscription = async (vendorId, { planId, billingCycle }) => {
  return withTransaction(async ({ session }) => {
    const plan = await SubscriptionPlan.findById(planId).session(session);
    if (!plan) throw ApiError.notFound('Plan not found');

    const amount = plan.pricing[billingCycle];
    if (!amount && amount !== 0) throw ApiError.badRequest('Invalid billing cycle for this plan');

    const existingActive = await VendorSubscription.findOne({ vendorId, status: SUBSCRIPTION_STATUS.ACTIVE }).session(session);
    if (existingActive) throw ApiError.conflict('Vendor already has an active subscription');

    const [subscription] = await VendorSubscription.create([{
      vendorId,
      planId,
      planKey: plan.key,
      billingCycle,
      amount,
      status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
      features: plan.features,
      limits: plan.limits,
    }], { session });

    await recordAuditEvent({
      eventType: 'subscriptions.created',
      module: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: subscription._id,
      action: 'create-subscription',
      afterSnapshot: { vendorId, planId, billingCycle, status: subscription.status },
    });

    return subscription;
  });
};

const activateSubscription = async (subscriptionId, paymentData, adminId) => {
  return withTransaction(async ({ session }) => {
    const sub = await VendorSubscription.findById(subscriptionId).session(session);
    if (!sub) throw ApiError.notFound('Subscription not found');

    const now = new Date();
    const billingDays = { monthly: 30, quarterly: 90, halfYearly: 180, annual: 365 };
    const days = billingDays[sub.billingCycle] || 30;
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const vendor = await Vendor.findById(sub.vendorId).session(session);
    if (!vendor) throw ApiError.notFound('Vendor not found');

    const existingActive = await VendorSubscription.findOne({ vendorId: sub.vendorId, status: SUBSCRIPTION_STATUS.ACTIVE, _id: { $ne: sub._id } }).session(session);
    if (existingActive) {
      existingActive.replacedBySubscriptionId = sub._id;
      existingActive.gracePeriodEndsAt = endDate;
      existingActive.status = SUBSCRIPTION_STATUS.EXPIRED;
      await existingActive.save();
      await revokeAssignmentsBySubscription(existingActive._id, { session, correlationId: `activate-${sub._id}` });
    }

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

    await syncVendorPlanInvariant(sub.vendorId, sub._id, sub.planKey, session);

    await recordAuditEvent({
      eventType: 'subscriptions.activated',
      module: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: sub._id,
      action: 'activate-subscription',
      actor: { actorType: 'admin', actorId: adminId, vendorId: sub.vendorId },
      afterSnapshot: { status: sub.status, paymentStatus: sub.paymentStatus, planKey: sub.planKey },
      metadata: { adminOverride: true },
    });
    await recordFinancialLedgerEvent({
      domain: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: sub._id,
      eventType: 'subscription-payment-captured',
      amount: Number(sub.amount || 0),
      metadata: { paymentReference: sub.paymentReference, vendorId: sub.vendorId },
    });
    await recordAuditEvent({
      eventType: 'vendors.plan.updated',
      module: 'subscriptions',
      entityType: 'Vendor',
      entityId: sub.vendorId,
      action: 'update-plan',
      afterSnapshot: { currentPlan: sub.planKey, activeSubscriptionId: sub._id },
    });

    return sub;
  });
};

const getVendorSubscriptions = async (vendorId) => {
  return VendorSubscription.find({ vendorId })
    .populate('planId', 'name displayName color')
    .sort({ createdAt: -1 });
};

const cancelSubscription = async (subscriptionId, vendorId, reason) => {
  return withTransaction(async ({ session }) => {
    const sub = await VendorSubscription.findOne({ _id: subscriptionId, vendorId, status: SUBSCRIPTION_STATUS.ACTIVE }).session(session);
    if (!sub) throw ApiError.notFound('Active subscription not found');

    const vendor = await Vendor.findById(vendorId).session(session);
    if (!vendor) throw ApiError.notFound('Vendor not found');
    if (vendor.activeSubscriptionId && !isSameObjectId(vendor.activeSubscriptionId, sub._id)) {
      throw ApiError.conflict('Vendor active subscription invariant violation');
    }

    sub.status = SUBSCRIPTION_STATUS.CANCELLED;
    sub.cancelledAt = new Date();
    sub.cancellationReason = reason;
    sub.autoRenew = false;
    await sub.save();

    await syncVendorPlanInvariant(vendorId, null, 'free', session);
    await revokeAssignmentsBySubscription(subscriptionId, { session, correlationId: `cancel-${subscriptionId}` });

    await recordAuditEvent({
      eventType: 'subscriptions.cancelled',
      module: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: sub._id,
      action: 'cancel-subscription',
      actor: { actorType: 'vendor_admin', actorId: vendorId, vendorId },
      afterSnapshot: { status: sub.status, cancellationReason: reason },
    });
    await recordAuditEvent({
      eventType: 'vendors.plan.updated',
      module: 'subscriptions',
      entityType: 'Vendor',
      entityId: vendorId,
      action: 'update-plan',
      afterSnapshot: { currentPlan: 'free', activeSubscriptionId: null },
    });

    return sub;
  });
};

const detectSubscriptionSlotInvariantMismatches = async () => {
  return detectSubscriptionSlotMismatches({});
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

const renewSubscription = async ({ subscriptionId, vendorId, actorId, payload = {} }) => {
  return withTransaction(async ({ session }) => {
    const sub = await VendorSubscription.findOne({ _id: subscriptionId, vendorId }).session(session);
    if (!sub) throw ApiError.notFound('Subscription not found');

    const currentStart = payload.validFrom || new Date();
    const durationDays = { monthly: 30, quarterly: 90, halfYearly: 180, annual: 365 };
    const days = durationDays[sub.billingCycle] || 30;
    const currentEnd = payload.validTo || new Date(new Date(currentStart).getTime() + days * 24 * 60 * 60 * 1000);

    sub.startDate = currentStart;
    sub.endDate = currentEnd;
    sub.nextBillingDate = currentEnd;
    sub.status = SUBSCRIPTION_STATUS.ACTIVE;
    sub.paymentStatus = 'paid';
    sub.renewalCount = Number(sub.renewalCount || 0) + 1;
    sub.gracePeriodUntil = null;
    sub.renewalHistory = [
      ...(sub.renewalHistory || []),
      {
        validFrom: currentStart,
        validTo: currentEnd,
        amount: Number(payload.amount || sub.amount || 0),
        renewedAt: new Date(),
        renewedBy: actorId,
        notes: payload.note || null,
      },
    ];
    await sub.save({ session });

    await recordAuditEvent({
      eventType: 'subscriptions.renewed',
      module: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: sub._id,
      action: 'renew-subscription',
      actor: { actorType: 'vendor_admin', actorId, vendorId },
      afterSnapshot: { startDate: sub.startDate, endDate: sub.endDate, renewalCount: sub.renewalCount },
    });
    await enqueueJob('emails', 'subscription-renewal-reminder-email', { subscriptionId: String(sub._id), vendorId: String(vendorId) });

    return sub;
  });
};

const retrySubscriptionRenewal = async ({ subscriptionId, vendorId, actorId, payload = {} }) => {
  const sub = await VendorSubscription.findOne({ _id: subscriptionId, vendorId });
  if (!sub) throw ApiError.notFound('Subscription not found');

  if (sub.paymentStatus !== 'failed') {
    throw ApiError.badRequest('Manual retry is allowed only for failed renewals');
  }

  sub.paymentStatus = 'pending';
  sub.status = SUBSCRIPTION_STATUS.PENDING_PAYMENT;
  sub.notes = payload.note || sub.notes;
  await sub.save();

  await recordAuditEvent({
    eventType: 'subscriptions.retry_requested',
    module: 'subscriptions',
    entityType: 'VendorSubscription',
    entityId: sub._id,
    action: 'retry-renewal',
    actor: { actorType: 'vendor_admin', actorId, vendorId },
    afterSnapshot: { status: sub.status, paymentStatus: sub.paymentStatus },
  });

  return sub;
};

const changeSubscriptionPlan = async ({ subscriptionId, vendorId, actorId, payload }) => {
  return withTransaction(async ({ session }) => {
    const sub = await VendorSubscription.findOne({ _id: subscriptionId, vendorId }).session(session);
    if (!sub) throw ApiError.notFound('Subscription not found');

    const plan = await SubscriptionPlan.findById(payload.planId).session(session);
    if (!plan) throw ApiError.notFound('Plan not found');

    const prevPlanId = sub.planId;
    sub.planId = plan._id;
    sub.planKey = plan.key;
    sub.features = plan.features;
    sub.limits = plan.limits;
    if (payload.billingCycle) {
      sub.billingCycle = payload.billingCycle;
      sub.amount = plan.pricing[payload.billingCycle] ?? sub.amount;
    }
    sub.planChangeHistory = [
      ...(sub.planChangeHistory || []),
      {
        fromPlanId: prevPlanId,
        toPlanId: plan._id,
        changedAt: new Date(),
        changedBy: actorId,
        notes: payload.note || null,
      },
    ];

    await sub.save({ session });
    await syncVendorPlanInvariant(vendorId, sub._id, sub.planKey, session);

    await recordAuditEvent({
      eventType: 'subscriptions.plan_changed',
      module: 'subscriptions',
      entityType: 'VendorSubscription',
      entityId: sub._id,
      action: 'change-plan',
      actor: { actorType: 'vendor_admin', actorId, vendorId },
      afterSnapshot: { planId: sub.planId, planKey: sub.planKey, billingCycle: sub.billingCycle },
    });

    return sub;
  });
};

export {
  createSubscription,
  activateSubscription,
  getVendorSubscriptions,
  cancelSubscription,
  renewSubscription,
  retrySubscriptionRenewal,
  changeSubscriptionPlan,
  getAllSubscriptions,
  detectSubscriptionSlotInvariantMismatches,
};
