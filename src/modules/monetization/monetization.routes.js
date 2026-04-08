import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import Vendor from '../../shared/models/Vendor.model.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { monetizationQuerySchema } from './monetization.validator.js';

const router = express.Router();

const getDashboard = asyncHandler(async (req, res) => {
  const [totalActiveSubscriptions, totalAssignedSlots, totalGoldVendors, totalSilverVendors, totalRedVendors] = await Promise.all([
    VendorSubscription.countDocuments({ status: 'active' }),
    SlotAssignment.countDocuments({ status: 'assigned' }),
    Vendor.countDocuments({ currentPlan: 'gold', isActive: true }),
    Vendor.countDocuments({ currentPlan: 'silver', isActive: true }),
    Vendor.countDocuments({ currentPlan: 'red', isActive: true }),
  ]);

  const recentSubscriptions = await VendorSubscription.find({ status: 'active' })
    .sort({ createdAt: -1 }).limit(10)
    .populate('vendorId', 'businessName').populate('planId', 'name displayName');

  ApiResponse.success(res, 'Monetization dashboard fetched', {
    summary: { totalActiveSubscriptions, totalAssignedSlots, totalGoldVendors, totalSilverVendors, totalRedVendors },
    recentSubscriptions,
  });
});

router.get('/dashboard', authenticate, isAdmin, validateRequest({ query: monetizationQuerySchema }), getDashboard);

export default router;
