import AnalyticsEvent from '../../shared/models/AnalyticsEvent.model.js';
import ListingBase from '../../shared/models/ListingBase.model.js';
import { ANALYTICS_EVENT_TYPES } from '../../shared/constants/index.js';
import logger from '../../utils/logger.js';
import mongoose from 'mongoose';

const trackEvent = async (eventData) => {
  try {
    await AnalyticsEvent.create(eventData);
  } catch (err) {
    logger.warn({ err }, 'Analytics event tracking failed');
  }
};

const getVendorAnalytics = async (vendorId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const baseMatch = { vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId), createdAt: { $gte: start, $lte: end } };

  const [eventSummary, dailyTrend, listingStats] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: baseMatch },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    ListingBase.find({ vendorId, isDeleted: false }).select('title slug stats').lean(),
  ]);

  const summary = {};
  eventSummary.forEach(e => { summary[e._id] = e.count; });

  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalImpressions: summary[ANALYTICS_EVENT_TYPES.LISTING_IMPRESSION] || 0,
      totalClicks: summary[ANALYTICS_EVENT_TYPES.LISTING_CLICK] || 0,
      totalWishlists: summary[ANALYTICS_EVENT_TYPES.WISHLIST_ADD] || 0,
      totalInquiries: summary[ANALYTICS_EVENT_TYPES.INQUIRY_SENT] || 0,
      totalPageViews: summary[ANALYTICS_EVENT_TYPES.PAGE_VIEW] || 0,
    },
    dailyTrend,
    listingPerformance: listingStats,
  };
};

const getAdminAnalytics = async (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [eventSummary, cityBreakdown, categoryBreakdown, deviceBreakdown] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { cityId: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$cityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
      { $unwind: '$city' },
      { $project: { cityName: '$city.name', count: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { categoryId: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { categoryName: '$category.name', count: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]),
  ]);

  const summary = {};
  eventSummary.forEach(e => { summary[e._id] = e.count; });

  return { period: { startDate: start, endDate: end }, summary, cityBreakdown, categoryBreakdown, deviceBreakdown };
};

export { trackEvent, getVendorAnalytics, getAdminAnalytics };
