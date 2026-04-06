import * as analyticsService from './analytics.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const track = asyncHandler(async (req, res) => {
  await analyticsService.trackEvent({ ...req.body, userId: req.user?.id, ipAddress: req.ip, userAgent: req.get('User-Agent') });
  ApiResponse.success(res, 'Event tracked');
});

const getMyAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getVendorAnalytics(req.user.vendorId, req.query.startDate, req.query.endDate);
  ApiResponse.success(res, 'Analytics fetched', data);
});

const getAdminAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminAnalytics(req.query.startDate, req.query.endDate);
  ApiResponse.success(res, 'Admin analytics fetched', data);
});

export { track, getMyAnalytics, getAdminAnalytics };
