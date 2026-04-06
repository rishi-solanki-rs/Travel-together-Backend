import AnalyticsEvent from '../shared/models/AnalyticsEvent.model.js';
import ListingBase from '../shared/models/ListingBase.model.js';
import Vendor from '../shared/models/Vendor.model.js';
import logger from '../utils/logger.js';
import { ANALYTICS_EVENT_TYPES } from '../shared/constants/index.js';

const run = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  logger.info(`analyticsAggregatorJob: Aggregating for ${yesterday.toDateString()}`);

  const listingStats = await AnalyticsEvent.aggregate([
    {
      $match: {
        listingId: { $ne: null },
        createdAt: { $gte: yesterday, $lte: endOfYesterday },
      },
    },
    {
      $group: {
        _id: { listingId: '$listingId', eventType: '$eventType' },
        count: { $sum: 1 },
      },
    },
  ]);

  const listingUpdates = {};
  listingStats.forEach(({ _id, count }) => {
    const lid = _id.listingId.toString();
    if (!listingUpdates[lid]) listingUpdates[lid] = {};
    if (_id.eventType === ANALYTICS_EVENT_TYPES.LISTING_IMPRESSION) listingUpdates[lid].views = count;
    if (_id.eventType === ANALYTICS_EVENT_TYPES.LISTING_CLICK) listingUpdates[lid].clicks = count;
    if (_id.eventType === ANALYTICS_EVENT_TYPES.INQUIRY_SENT) listingUpdates[lid].inquiries = count;
  });

  const bulkOps = Object.entries(listingUpdates).map(([id, stats]) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $inc: {
          ...(stats.views && { 'stats.views': stats.views }),
          ...(stats.clicks && { 'stats.clicks': stats.clicks }),
          ...(stats.inquiries && { 'stats.inquiryCount': stats.inquiries }),
        },
      },
    },
  }));

  if (bulkOps.length) {
    await ListingBase.bulkWrite(bulkOps);
  }

  logger.info(`analyticsAggregatorJob: Updated stats for ${bulkOps.length} listings`);
};

export { run };
