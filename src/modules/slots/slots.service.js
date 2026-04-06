import SlotInventory from '../../shared/models/SlotInventory.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import ApiError from '../../utils/ApiError.js';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination.js';
import { SLOT_STATUS, PLAN_PRIORITY } from '../../shared/constants/index.js';

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

const assignSlot = async (vendorId, subscriptionId, inventoryId, data) => {
  const inventory = await SlotInventory.findById(inventoryId);
  if (!inventory) throw ApiError.notFound('Slot inventory not found');
  if (inventory.availableSlots <= 0) throw ApiError.badRequest('No slots available in this inventory');

  const vendor = await Vendor.findById(vendorId);
  const priority = PLAN_PRIORITY[vendor?.currentPlan] || 0;

  const now = new Date();
  const assignment = await SlotAssignment.create({
    vendorId,
    subscriptionId,
    inventoryId,
    slotType: inventory.slotType,
    cityId: inventory.cityId,
    categoryId: inventory.categoryId,
    subtypeId: inventory.subtypeId,
    status: SLOT_STATUS.ASSIGNED,
    startDate: now,
    priority,
    ...data,
  });

  await SlotInventory.findByIdAndUpdate(inventoryId, {
    $inc: { assignedSlots: 1, availableSlots: -1 },
  });

  if (data.listingId) {
    await ListingBase.findByIdAndUpdate(data.listingId, { isFeatured: true, isPremium: true, planPriority: priority });
  }

  return assignment;
};

const getVendorSlots = async (vendorId) => {
  return SlotAssignment.find({ vendorId })
    .populate('inventoryId', 'slotType')
    .populate('listingId', 'title slug')
    .sort({ createdAt: -1 });
};

const expireSlot = async (assignmentId) => {
  const assignment = await SlotAssignment.findByIdAndUpdate(
    assignmentId,
    { status: SLOT_STATUS.EXPIRED, expiredAt: new Date() },
    { new: true }
  );

  if (assignment) {
    await SlotInventory.findByIdAndUpdate(assignment.inventoryId, {
      $inc: { assignedSlots: -1, availableSlots: 1 },
    });

    if (assignment.listingId) {
      await ListingBase.findByIdAndUpdate(assignment.listingId, { isFeatured: false, isPremium: false, planPriority: 0 });
    }
  }

  return assignment;
};

const getFeaturedListingsBySlot = async (slotType, cityId = null, limit = 10) => {
  const filter = { slotType, status: SLOT_STATUS.ASSIGNED };
  if (cityId) filter.cityId = cityId;

  const assignments = await SlotAssignment.find(filter)
    .sort({ priority: -1 })
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

export { createInventory, getInventory, assignSlot, getVendorSlots, expireSlot, getFeaturedListingsBySlot, getAllAssignments };
