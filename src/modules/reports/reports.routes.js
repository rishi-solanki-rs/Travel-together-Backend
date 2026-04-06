import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isAdmin } from '../../middlewares/authorize.js';
import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import Vendor from '../../shared/models/Vendor.model.js';
import VendorSubscription from '../../shared/models/VendorSubscription.model.js';
import SlotAssignment from '../../shared/models/SlotAssignment.model.js';
import Inquiry from '../../shared/models/Inquiry.model.js';
import AnalyticsEvent from '../../shared/models/AnalyticsEvent.model.js';
import { SUBSCRIPTION_STATUS, SLOT_STATUS } from '../../shared/constants/index.js';

const router = express.Router();

const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [revenueByPlan, revenueByCity, totalActive] = await Promise.all([
    VendorSubscription.aggregate([
      { $match: { status: SUBSCRIPTION_STATUS.ACTIVE, startDate: { $gte: start, $lte: end } } },
      { $group: { _id: '$planKey', totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    VendorSubscription.aggregate([
      { $match: { status: SUBSCRIPTION_STATUS.ACTIVE, startDate: { $gte: start, $lte: end } } },
      { $lookup: { from: 'vendors', localField: 'vendorId', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $group: { _id: '$vendor.cityId', totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
      { $unwind: { path: '$city', preserveNullAndEmpty: true } },
      { $project: { cityName: '$city.name', totalRevenue: 1, count: 1 } },
      { $sort: { totalRevenue: -1 } },
    ]),
    VendorSubscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE }),
  ]);

  ApiResponse.success(res, 'Revenue report fetched', { period: { start, end }, revenueByPlan, revenueByCity, totalActive });
});

const getSlotOccupancyReport = asyncHandler(async (req, res) => {
  const data = await SlotAssignment.aggregate([
    { $match: { status: SLOT_STATUS.ASSIGNED } },
    { $group: { _id: '$slotType', total: { $sum: 1 } } },
  ]);
  ApiResponse.success(res, 'Slot occupancy report fetched', data);
});

const getInquiryConversionReport = asyncHandler(async (req, res) => {
  const data = await Inquiry.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  ApiResponse.success(res, 'Inquiry conversion report fetched', data);
});

router.get('/revenue', authenticate, isAdmin, getRevenueReport);
router.get('/slot-occupancy', authenticate, isAdmin, getSlotOccupancyReport);
router.get('/inquiry-conversion', authenticate, isAdmin, getInquiryConversionReport);

export default router;
