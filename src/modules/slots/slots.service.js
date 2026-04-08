import SlotInventory from '../../shared/models/SlotInventory.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { SLOT_STATUS, PLAN_PRIORITY } from '../../shared/constants/index.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import logger from '../../utils/logger.js';
import env from '../../config/env.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';

const isSlotTxAssignEnabled = env.FF_SLOT_TX_ASSIGN !== false;

const isSameObjectId = (left, right) => {
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

const validateInventoryScope = (inventory, listing) => {
  if (!inventory || !listing) return;
  if (inventory.cityId && !isSameObjectId(inventory.cityId, listing.cityId)) {
    throw ApiError.badRequest('Listing city does not match slot inventory city');
  }
  if (inventory.categoryId && !isSameObjectId(inventory.categoryId, listing.categoryId)) {
    throw ApiError.badRequest('Listing category does not match slot inventory category');
  }
  if (inventory.subtypeId && (!listing.subtypeId || !isSameObjectId(inventory.subtypeId, listing.subtypeId))) {
    throw ApiError.badRequest('Listing subtype does not match slot inventory subtype');
  }
};

const buildFeaturedSort = () => ({ priority: -1, endDate: -1, createdAt: -1, _id: 1 });

const ensureVendorSubscriptionInvariant = (vendor, subscription) => {
  if (!vendor || !subscription) return;
  if (vendor.activeSubscriptionId && !isSameObjectId(vendor.activeSubscriptionId, subscription._id)) {
    throw ApiError.badRequest('Vendor active subscription mismatch');
  }
};

const releaseInventoryForAssignment = async (assignment, session) => {
  if (!assignment?.inventoryId) return;
  const updated = await SlotInventory.findOneAndUpdate(
    {
      _id: assignment.inventoryId,
      assignedSlots: { $gt: 0 },
      $expr: { $lt: ['$availableSlots', '$totalSlots'] },
    },
    { $inc: { assignedSlots: -1, availableSlots: 1 } },
    { new: true, session }
  );
  if (!updated) {
    logger.warn({ assignmentId: assignment._id, inventoryId: assignment.inventoryId }, 'Inventory release skipped due to guard check');
  }
};

const recomputeListingPremiumState = async (listingId, session) => {
  if (!listingId) return;
  const now = new Date();
  const topAssignment = await SlotAssignment.findOne({
    listingId,
    status: SLOT_STATUS.ASSIGNED,
    endDate: { $gte: now },
  })
    .sort(buildFeaturedSort())
    .session(session)
    .lean();

  if (!topAssignment) {
    await ListingBase.findByIdAndUpdate(listingId, {
      isFeatured: false,
      isPremium: false,
      planPriority: 0,
    }, { session });
    return;
  }

  await ListingBase.findByIdAndUpdate(listingId, {
    isFeatured: true,
    isPremium: true,
    planPriority: topAssignment.priority || 0,
  }, { session });
};

const expireAssignmentDocument = async (assignment, session, expiredAt = new Date()) => {
  if (!assignment || assignment.status !== SLOT_STATUS.ASSIGNED) return assignment;
  const beforeStatus = assignment.status;
  assignment.status = SLOT_STATUS.EXPIRED;
  assignment.expiredAt = expiredAt;
  await assignment.save({ session });
  await recordAuditEvent({
    eventType: 'slots.assignment.expired',
    module: 'slots',
    entityType: 'SlotAssignment',
    entityId: assignment._id,
    action: 'expire-slot',
    beforeSnapshot: { status: beforeStatus },
    afterSnapshot: { status: assignment.status, expiredAt },
  });
  await releaseInventoryForAssignment(assignment, session);
  if (assignment.listingId) {
    await recomputeListingPremiumState(assignment.listingId, session);
  }
  return assignment;
};

const createInventory = async (data, userId) => {
  const inventory = await SlotInventory.create({ ...data, createdBy: userId, availableSlots: data.totalSlots });
  return inventory;
};

const getInventory = async (query = {}) => {
  const filter = {};
  if (query.slotType) filter.slotType = query.slotType;
  if (query.cityId) filter.cityId = query.cityId;
  if (query.categoryId) filter.categoryId = query.categoryId;
  return SlotInventory.find(filter).populate('cityId', 'name').populate('categoryId', 'name').lean();
};

const assignSlotTx = async (vendorId, subscriptionId, inventoryId, data) => {
  return withTransaction(async ({ session, correlationId }) => {
    const now = new Date();
    const inventory = await SlotInventory.findById(inventoryId).session(session);
    if (!inventory) throw ApiError.notFound('Slot inventory not found');

    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false }).session(session);
    if (!vendor) throw ApiError.notFound('Vendor not found');

    const subscription = await VendorSubscription.findOne({
      _id: subscriptionId,
      vendorId,
      status: 'active',
      paymentStatus: 'paid',
      endDate: { $gte: now },
    }).session(session);
    if (!subscription) throw ApiError.badRequest('Subscription is not active, paid, or valid');
    ensureVendorSubscriptionInvariant(vendor, subscription);

    let listing = null;
    if (data.listingId) {
      listing = await ListingBase.findOne({ _id: data.listingId, vendorId, isDeleted: false }).session(session);
      if (!listing) throw ApiError.badRequest('Listing not found or does not belong to vendor');
      validateInventoryScope(inventory, listing);
    }

    const hasIdempotency = Boolean(data.idempotencyKey);
    if (hasIdempotency) {
      const existing = await SlotAssignment.findOne({
        vendorId,
        subscriptionId,
        inventoryId,
        idempotencyKey: data.idempotencyKey,
      }).session(session);
      if (existing) return existing;
    }

    const decremented = await SlotInventory.findOneAndUpdate(
      {
        _id: inventoryId,
        isActive: true,
        availableSlots: { $gt: 0 },
        $expr: { $lt: ['$assignedSlots', '$totalSlots'] },
      },
      { $inc: { assignedSlots: 1, availableSlots: -1 } },
      { new: true, session }
    );
    if (!decremented) {
      incrementCounter('tii_slot_assignment_contention_total', 1, { inventoryId: String(inventoryId) });
      throw ApiError.badRequest('No slots available in this inventory');
    }

    const priority = PLAN_PRIORITY[subscription.planKey] ?? PLAN_PRIORITY[vendor.currentPlan] ?? 0;

    const [assignment] = await SlotAssignment.create([
      {
        vendorId,
        subscriptionId,
        inventoryId,
        slotType: inventory.slotType,
        cityId: inventory.cityId,
        categoryId: inventory.categoryId,
        subtypeId: inventory.subtypeId,
        status: SLOT_STATUS.ASSIGNED,
        startDate: now,
        endDate: data.endDate || subscription.endDate || now,
        priority,
        campaignBoost: Boolean(data.campaignBoost),
        campaignBoostExpiry: data.campaignBoostExpiry || null,
        listingId: data.listingId || null,
        assignedBy: data.assignedBy || null,
        notes: data.notes || null,
        idempotencyKey: data.idempotencyKey || null,
      },
    ], { session });

    if (listing) {
      await ListingBase.findByIdAndUpdate(listing._id, {
        isFeatured: true,
        isPremium: true,
        planPriority: priority,
      }, { session });
    }

    logger.info({ correlationId, assignmentId: assignment._id, inventoryId }, 'Slot assigned transactionally');
    await recordAuditEvent({
      eventType: 'slots.assignment.created',
      module: 'slots',
      entityType: 'SlotAssignment',
      entityId: assignment._id,
      action: 'assign-slot',
      context: { correlationId, module: 'slots' },
      afterSnapshot: {
        inventoryId: assignment.inventoryId,
        vendorId: assignment.vendorId,
        subscriptionId: assignment.subscriptionId,
        listingId: assignment.listingId,
        slotType: assignment.slotType,
      },
    });
    await recordFinancialLedgerEvent({
      domain: 'slots',
      entityType: 'SlotAssignment',
      entityId: assignment._id,
      eventType: 'slot-assignment',
      amount: 0,
      metadata: { inventoryId, vendorId, subscriptionId },
      correlationId,
    });
    return assignment;
  }, {
    correlationId: data.correlationId || null,
    maxAttempts: 2,
    retryHook: async ({ error }) => {
      if (!error) return false;
      const message = String(error.message || '').toLowerCase();
      return message.includes('writeconflict') || message.includes('temporarily unavailable');
    },
  });
};

const assignSlotLegacy = async (vendorId, subscriptionId, inventoryId, data) => {
  const inventory = await SlotInventory.findById(inventoryId);
  if (!inventory) throw ApiError.notFound('Slot inventory not found');

  const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });
  if (!vendor) throw ApiError.notFound('Vendor not found');

  const subscription = await VendorSubscription.findOne({
    _id: subscriptionId,
    vendorId,
    status: 'active',
    paymentStatus: 'paid',
    endDate: { $gte: new Date() },
  });
  if (!subscription) throw ApiError.badRequest('Subscription is not active, paid, or valid');

  let listing = null;
  if (data.listingId) {
    listing = await ListingBase.findOne({ _id: data.listingId, vendorId, isDeleted: false });
    if (!listing) throw ApiError.badRequest('Listing not found or does not belong to vendor');
    validateInventoryScope(inventory, listing);
  }

  if (data.idempotencyKey) {
    const existing = await SlotAssignment.findOne({
      vendorId,
      subscriptionId,
      inventoryId,
      idempotencyKey: data.idempotencyKey,
    });
    if (existing) return existing;
  }

  if (inventory.availableSlots <= 0) throw ApiError.badRequest('No slots available in this inventory');

  const priority = PLAN_PRIORITY[subscription.planKey] ?? PLAN_PRIORITY[vendor.currentPlan] ?? 0;
  const assignment = await SlotAssignment.create({
    vendorId,
    subscriptionId,
    inventoryId,
    slotType: inventory.slotType,
    cityId: inventory.cityId,
    categoryId: inventory.categoryId,
    subtypeId: inventory.subtypeId,
    status: SLOT_STATUS.ASSIGNED,
    startDate: new Date(),
    endDate: data.endDate || subscription.endDate || new Date(),
    priority,
    campaignBoost: Boolean(data.campaignBoost),
    campaignBoostExpiry: data.campaignBoostExpiry || null,
    listingId: data.listingId || null,
    assignedBy: data.assignedBy || null,
    notes: data.notes || null,
    idempotencyKey: data.idempotencyKey || null,
  });

  await SlotInventory.findByIdAndUpdate(inventoryId, { $inc: { assignedSlots: 1, availableSlots: -1 } });
  if (listing) {
    await ListingBase.findByIdAndUpdate(listing._id, { isFeatured: true, isPremium: true, planPriority: priority });
  }
  return assignment;
};

const assignSlot = async (vendorId, subscriptionId, inventoryId, data) => {
  if (isSlotTxAssignEnabled) return assignSlotTx(vendorId, subscriptionId, inventoryId, data);
  logger.warn('FF_SLOT_TX_ASSIGN disabled: using legacy slot assignment path');
  return assignSlotLegacy(vendorId, subscriptionId, inventoryId, data);
};

const getVendorSlots = async (vendorId) => {
  return SlotAssignment.find({ vendorId })
    .populate('inventoryId', 'slotType')
    .populate('listingId', 'title slug')
    .sort({ createdAt: -1 });
};

const expireSlot = async (assignmentId) => {
  return withTransaction(async ({ session }) => {
    const assignment = await SlotAssignment.findById(assignmentId).session(session);
    if (!assignment) throw ApiError.notFound('Slot assignment not found');
    if (assignment.status !== SLOT_STATUS.ASSIGNED) {
      throw ApiError.badRequest('Slot assignment is not active');
    }
    return expireAssignmentDocument(assignment, session);
  });
};

const releaseSlotAssignment = async (assignmentId) => {
  return expireSlot(assignmentId);
};

const getSlotAnalytics = async (query = {}) => {
  const assignmentFilter = {};
  const inventoryFilter = {};

  if (query.vendorId) assignmentFilter.vendorId = query.vendorId;
  if (query.slotType) {
    assignmentFilter.slotType = query.slotType;
    inventoryFilter.slotType = query.slotType;
  }
  if (query.cityId) {
    assignmentFilter.cityId = query.cityId;
    inventoryFilter.cityId = query.cityId;
  }
  if (query.categoryId) {
    assignmentFilter.categoryId = query.categoryId;
    inventoryFilter.categoryId = query.categoryId;
  }
  if (query.subtypeId) {
    assignmentFilter.subtypeId = query.subtypeId;
    inventoryFilter.subtypeId = query.subtypeId;
  }

  const [assignments, inventories, mismatches] = await Promise.all([
    SlotAssignment.find(assignmentFilter).sort({ createdAt: -1 }).lean(),
    SlotInventory.find(inventoryFilter).sort({ createdAt: -1 }).lean(),
    detectSubscriptionSlotMismatches({}).then((rows) => rows.filter((row) => {
      if (query.vendorId && String(row.vendorId) !== String(query.vendorId)) return false;
      return true;
    })),
  ]);

  const summary = assignments.reduce((acc, assignment) => {
    acc.totalAssignments += 1;
    acc.byStatus[assignment.status] = (acc.byStatus[assignment.status] || 0) + 1;
    acc.bySlotType[assignment.slotType] = (acc.bySlotType[assignment.slotType] || 0) + 1;
    if (assignment.status === SLOT_STATUS.ASSIGNED) acc.activeAssignments += 1;
    if (assignment.status === SLOT_STATUS.EXPIRED) acc.expiredAssignments += 1;
    return acc;
  }, {
    totalAssignments: 0,
    activeAssignments: 0,
    expiredAssignments: 0,
    byStatus: {},
    bySlotType: {},
  });

  const inventorySummary = inventories.reduce((acc, inventory) => {
    acc.totalInventorySlots += Number(inventory.totalSlots || 0);
    acc.availableSlots += Number(inventory.availableSlots || 0);
    acc.assignedSlots += Number(inventory.assignedSlots || 0);
    return acc;
  }, {
    totalInventorySlots: 0,
    availableSlots: 0,
    assignedSlots: 0,
  });

  return {
    summary: {
      ...summary,
      mismatchCount: mismatches.length,
      inventoryCount: inventories.length,
      ...inventorySummary,
    },
    recentAssignments: assignments.slice(0, 20),
    inventories,
    mismatches: mismatches.slice(0, 20),
  };
};

const revokeAssignmentsBySubscription = async (subscriptionId, options = {}) => {
  const now = new Date();
  const execute = async ({ session }) => {
    const assignments = await SlotAssignment.find({
      subscriptionId,
      status: SLOT_STATUS.ASSIGNED,
    }).session(session);

    let revoked = 0;
    for (const assignment of assignments) {
      await expireAssignmentDocument(assignment, session, now);
      revoked += 1;
    }
    return { revoked };
  };

  if (options.session) {
    return execute({ session: options.session });
  }
  return withTransaction(async ({ session }) => execute({ session }), { correlationId: options.correlationId || null });
};

const detectSubscriptionSlotMismatches = async ({ session } = {}) => {
  const now = new Date();
  const assignments = await SlotAssignment.find({ status: SLOT_STATUS.ASSIGNED })
    .populate('subscriptionId', 'status paymentStatus endDate vendorId')
    .session(session || null)
    .lean();

  return assignments
    .filter((assignment) => {
      const subscription = assignment.subscriptionId;
      if (!subscription) return true;
      if (!isSameObjectId(subscription.vendorId, assignment.vendorId)) return true;
      if (subscription.status !== 'active') return true;
      if (subscription.paymentStatus !== 'paid') return true;
      if (!subscription.endDate || new Date(subscription.endDate) < now) return true;
      return false;
    })
    .map((assignment) => ({
      assignmentId: assignment._id,
      vendorId: assignment.vendorId,
      subscriptionId: assignment.subscriptionId?._id || null,
      reason: !assignment.subscriptionId
        ? 'missing_subscription'
        : !isSameObjectId(assignment.subscriptionId.vendorId, assignment.vendorId)
          ? 'vendor_subscription_mismatch'
          : assignment.subscriptionId.status !== 'active'
            ? 'subscription_not_active'
            : assignment.subscriptionId.paymentStatus !== 'paid'
              ? 'subscription_unpaid'
              : 'subscription_expired',
    }));
};

const reconcileOrphanAssignments = async (options = {}) => {
  return withTransaction(async ({ session }) => {
    const mismatches = await detectSubscriptionSlotMismatches({ session });
    let reconciled = 0;
    for (const mismatch of mismatches) {
      const assignment = await SlotAssignment.findById(mismatch.assignmentId).session(session);
      if (!assignment || assignment.status !== SLOT_STATUS.ASSIGNED) continue;
      await expireAssignmentDocument(assignment, session);
      reconciled += 1;
    }
    return { mismatches, reconciled };
  }, { correlationId: options.correlationId || null });
};

const getFeaturedListingsBySlot = async (slotType, cityId = null, limit = 10) => {
  const filter = { slotType, status: SLOT_STATUS.ASSIGNED };
  if (cityId) filter.cityId = cityId;

  const assignments = await SlotAssignment.find(filter)
    .sort(buildFeaturedSort())
    .limit(limit)
    .populate({ path: 'listingId', select: 'title slug coverImage pricing category stats', populate: { path: 'cityId', select: 'name' } })
    .lean();

  return assignments.map(a => a.listingId).filter(Boolean);
};

const getAllAssignments = async (query = {}) => {
  const { page, perPage, skip } = parsePaginationQuery(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.vendorId) filter.vendorId = query.vendorId;
  if (query.slotType) filter.slotType = query.slotType;

  const [assignments, total] = await Promise.all([
    SlotAssignment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage)
      .populate('vendorId', 'businessName').populate('listingId', 'title'),
    SlotAssignment.countDocuments(filter),
  ]);

  return { assignments, pagination: buildPaginationMeta(page, perPage, total) };
};

export {
  createInventory,
  getInventory,
  assignSlot,
  getVendorSlots,
  expireSlot,
  releaseSlotAssignment,
  getSlotAnalytics,
  getFeaturedListingsBySlot,
  getAllAssignments,
  revokeAssignmentsBySubscription,
  detectSubscriptionSlotMismatches,
  reconcileOrphanAssignments,
};
