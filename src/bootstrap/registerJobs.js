import cron from 'node-cron';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { run as runSlotExpiry } from '../jobs/slotExpiryJob.js';
import { run as runSubscriptionRenewal } from '../jobs/subscriptionRenewalJob.js';
import { run as runCampaignScheduler } from '../jobs/campaignSchedulerJob.js';
import { run as runAnalyticsAggregator } from '../jobs/analyticsAggregatorJob.js';
import { run as runMediaCleanup } from '../jobs/mediaCleanupJob.js';
import { run as runMediaOrphanReconciliation } from '../jobs/mediaOrphanReconciliationJob.js';
import { run as runReconciliation } from '../jobs/reconciliationJob.js';
import { run as runPrivacyRetention } from '../jobs/privacyRetentionJob.js';
import { startTimer, incrementCounter } from '../operations/metrics/metrics.service.js';
import { emitAlert } from '../operations/alerts/alerting.service.js';
import { runSafetyChecks } from '../operations/alerts/safetyMonitor.service.js';

const runCronJob = async (jobName, runner) => {
  const stop = startTimer('tii_cron_duration_ms', { job: jobName });
  try {
    await runner();
    incrementCounter('tii_cron_success_total', 1, { job: jobName });
  } catch (err) {
    incrementCounter('tii_cron_failure_total', 1, { job: jobName });
    await emitAlert({
      policy: 'cron-failure',
      value: 1,
      threshold: 1,
      summary: `${jobName} failed`,
      severity: 'critical',
      context: { jobName, error: err?.message || 'unknown error' },
    });
    throw err;
  } finally {
    stop();
  }
};

const registerJobs = () => {
  if (env.NODE_ENV === 'test') return;

  logger.info('⚙️  Registering cron jobs...');

  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running: slotExpiryJob');
    await runCronJob('slotExpiryJob', runSlotExpiry).catch(err => logger.error({ err }, 'slotExpiryJob failed'));
  }, { name: 'slotExpiryJob', timezone: 'Asia/Kolkata' });

  cron.schedule('0 9 * * *', async () => {
    logger.info('Running: subscriptionRenewalJob');
    await runCronJob('subscriptionRenewalJob', runSubscriptionRenewal).catch(err => logger.error({ err }, 'subscriptionRenewalJob failed'));
  }, { name: 'subscriptionRenewalJob', timezone: 'Asia/Kolkata' });

  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running: campaignSchedulerJob');
    await runCronJob('campaignSchedulerJob', runCampaignScheduler).catch(err => logger.error({ err }, 'campaignSchedulerJob failed'));
  }, { name: 'campaignSchedulerJob', timezone: 'Asia/Kolkata' });

  cron.schedule('0 2 * * *', async () => {
    logger.info('Running: analyticsAggregatorJob');
    await runCronJob('analyticsAggregatorJob', runAnalyticsAggregator).catch(err => logger.error({ err }, 'analyticsAggregatorJob failed'));
  }, { name: 'analyticsAggregatorJob', timezone: 'Asia/Kolkata' });

  cron.schedule('30 2 * * *', async () => {
    logger.info('Running: mediaOrphanReconciliationJob');
    await runCronJob('mediaOrphanReconciliationJob', runMediaOrphanReconciliation).catch(err => logger.error({ err }, 'mediaOrphanReconciliationJob failed'));
  }, { name: 'mediaOrphanReconciliationJob', timezone: 'Asia/Kolkata' });

  cron.schedule('0 3 * * *', async () => {
    logger.info('Running: mediaCleanupJob');
    await runCronJob('mediaCleanupJob', runMediaCleanup).catch(err => logger.error({ err }, 'mediaCleanupJob failed'));
  }, { name: 'mediaCleanupJob', timezone: 'Asia/Kolkata' });

  cron.schedule('15 3 * * *', async () => {
    logger.info('Running: reconciliationJob');
    await runCronJob('reconciliationJob', runReconciliation).catch(err => logger.error({ err }, 'reconciliationJob failed'));
  }, { name: 'reconciliationJob', timezone: 'Asia/Kolkata' });

  cron.schedule('*/10 * * * *', async () => {
    logger.info('Running: safetyMonitor');
    await runCronJob('safetyMonitor', runSafetyChecks).catch(err => logger.error({ err }, 'safetyMonitor failed'));
  }, { name: 'safetyMonitor', timezone: 'Asia/Kolkata' });

  cron.schedule('45 3 * * *', async () => {
    logger.info('Running: privacyRetentionJob');
    await runCronJob('privacyRetentionJob', runPrivacyRetention).catch(err => logger.error({ err }, 'privacyRetentionJob failed'));
  }, { name: 'privacyRetentionJob', timezone: 'Asia/Kolkata' });

  logger.info('✅ Cron jobs registered');
};

export default registerJobs;
