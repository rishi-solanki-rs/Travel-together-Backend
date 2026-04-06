import * as slotsService from './slots.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createInventory = asyncHandler(async (req, res) => { const inv = await slotsService.createInventory(req.body, req.user.id); ApiResponse.created(res, 'Slot inventory created', inv); });
const getInventory = asyncHandler(async (req, res) => { const inv = await slotsService.getInventory(req.query); ApiResponse.success(res, 'Slot inventory fetched', inv); });
const assign = asyncHandler(async (req, res) => { const ass = await slotsService.assignSlot(req.body.vendorId, req.body.subscriptionId, req.body.inventoryId, req.body); ApiResponse.created(res, 'Slot assigned', ass); });
const getMySlots = asyncHandler(async (req, res) => { const slots = await slotsService.getVendorSlots(req.user.vendorId); ApiResponse.success(res, 'Your slots fetched', slots); });
const getFeatured = asyncHandler(async (req, res) => { const listings = await slotsService.getFeaturedListingsBySlot(req.params.slotType, req.query.cityId, parseInt(req.query.limit) || 10); ApiResponse.success(res, 'Featured listings fetched', listings); });
const getAll = asyncHandler(async (req, res) => { const { assignments, pagination } = await slotsService.getAllAssignments(req.query); ApiResponse.paginated(res, 'Slot assignments fetched', assignments, pagination); });

export { createInventory, getInventory, assign, getMySlots, getFeatured, getAll };
