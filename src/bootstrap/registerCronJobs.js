import cron from 'node-cron';
import logger from '../utils/logger.js';
import { run as runSlotExpiry } from '../jobs/slotExpiryJob.js';
import { run as runSubscriptionRenewal } from '../jobs/subscriptionRenewalJob.js';
import { run as runLuckyDrawPicker } from '../jobs/luckyDrawPickerJob.js';
import { run as runAnalyticsAggregator } from '../jobs/analyticsAggregatorJob.js';
import { run as runCampaignScheduler } from '../jobs/campaignSchedulerJob.js';

const wrap = (jobFn, name) => async () => {
  logger.info(`⏰ Cron: ${name} starting`);
  try {
    await jobFn();
    logger.info(`✅ Cron: ${name} complete`);
  } catch (err) {
    logger.error({ err }, `❌ Cron: ${name} failed`);
  }
};

const registerCronJobs = () => {
  cron.schedule('*/5 * * * *', wrap(runCampaignScheduler, 'campaignSchedulerJob'), { name: 'campaignScheduler' });
  cron.schedule('0 * * * *', wrap(runSlotExpiry, 'slotExpiryJob'), { name: 'slotExpiry' });
  cron.schedule('0 9 * * *', wrap(runSubscriptionRenewal, 'subscriptionRenewalJob'), { name: 'subscriptionRenewal' });
  cron.schedule('30 3 * * *', wrap(runAnalyticsAggregator, 'analyticsAggregatorJob'), { name: 'analyticsAggregator' });
  cron.schedule('0 0 * * *', wrap(runLuckyDrawPicker, 'luckyDrawPickerJob'), { name: 'luckyDrawPicker' });

  logger.info('📅 All cron jobs registered');
};

export default registerCronJobs;
