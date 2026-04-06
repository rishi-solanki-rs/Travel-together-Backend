import cron from 'node-cron';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { run as runSlotExpiry } from '../jobs/slotExpiryJob.js';
import { run as runSubscriptionRenewal } from '../jobs/subscriptionRenewalJob.js';
import { run as runCampaignScheduler } from '../jobs/campaignSchedulerJob.js';
import { run as runAnalyticsAggregator } from '../jobs/analyticsAggregatorJob.js';

const registerJobs = () => {
  if (env.NODE_ENV === 'test') return;

  logger.info('⚙️  Registering cron jobs...');

  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running: slotExpiryJob');
    await runSlotExpiry().catch(err => logger.error({ err }, 'slotExpiryJob failed'));
  }, { name: 'slotExpiryJob', timezone: 'Asia/Kolkata' });

  cron.schedule('0 9 * * *', async () => {
    logger.info('Running: subscriptionRenewalJob');
    await runSubscriptionRenewal().catch(err => logger.error({ err }, 'subscriptionRenewalJob failed'));
  }, { name: 'subscriptionRenewalJob', timezone: 'Asia/Kolkata' });

  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running: campaignSchedulerJob');
    await runCampaignScheduler().catch(err => logger.error({ err }, 'campaignSchedulerJob failed'));
  }, { name: 'campaignSchedulerJob', timezone: 'Asia/Kolkata' });

  cron.schedule('0 2 * * *', async () => {
    logger.info('Running: analyticsAggregatorJob');
    await runAnalyticsAggregator().catch(err => logger.error({ err }, 'analyticsAggregatorJob failed'));
  }, { name: 'analyticsAggregatorJob', timezone: 'Asia/Kolkata' });

  logger.info('✅ Cron jobs registered');
};

export default registerJobs;
