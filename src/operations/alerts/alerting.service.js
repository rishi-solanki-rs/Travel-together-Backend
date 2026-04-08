import axios from 'axios';
import logger from '../../utils/logger.js';
import env from '../../config/env.js';
import { getCorrelationId } from '../../shared/context/requestContext.js';
import { incrementCounter } from '../metrics/metrics.service.js';
import { sanitizeSecrets, validateOutboundUrl } from '../security/runtimeSecurity.service.js';

const DEFAULT_THRESHOLDS = {
  negativeInventory: Number(env.ALERT_NEGATIVE_INVENTORY_THRESHOLD || 1),
  slotMismatch: Number(env.ALERT_SLOT_MISMATCH_THRESHOLD || 1),
  paymentMismatch: Number(env.ALERT_PAYMENT_MISMATCH_THRESHOLD || 1),
  reconciliationDrift: Number(env.ALERT_RECON_DRIFT_THRESHOLD || 1),
  dlqGrowth: Number(env.ALERT_DLQ_GROWTH_THRESHOLD || 10),
  failedDeleteRetries: Number(env.ALERT_DELETE_RETRY_THRESHOLD || 5),
  homepageP95Ms: Number(env.ALERT_HOMEPAGE_P95_MS || 1200),
  bookingFailures: Number(env.ALERT_BOOKING_FAILURE_THRESHOLD || 5),
  duplicateCheckoutSpikes: Number(env.ALERT_DUPLICATE_CHECKOUT_THRESHOLD || 5),
  memoryPressureMb: Number(env.ALERT_MEMORY_PRESSURE_MB || 512),
};

const evaluateThresholds = (snapshot, thresholds = DEFAULT_THRESHOLDS) => {
  const breaches = [];
  for (const [key, threshold] of Object.entries(thresholds)) {
    const value = Number(snapshot?.[key] || 0);
    if (value >= threshold) {
      breaches.push({ key, value, threshold });
    }
  }
  return breaches;
};

const sendToSlack = async (message) => {
  if (!env.SLACK_ALERT_WEBHOOK_URL) return false;
  await axios.post(validateOutboundUrl(env.SLACK_ALERT_WEBHOOK_URL), { text: message });
  return true;
};

const sendToWebhook = async (payload) => {
  if (!env.ALERT_WEBHOOK_URL) return false;
  await axios.post(validateOutboundUrl(env.ALERT_WEBHOOK_URL), payload);
  return true;
};

const sendToPagerDuty = async (payload) => {
  if (!env.PAGERDUTY_EVENTS_URL || !env.PAGERDUTY_ROUTING_KEY) return false;
  await axios.post(validateOutboundUrl(env.PAGERDUTY_EVENTS_URL), {
    routing_key: env.PAGERDUTY_ROUTING_KEY,
    event_action: 'trigger',
    payload: {
      summary: payload.summary,
      source: 'together-in-india-backend',
      severity: payload.severity || 'warning',
      custom_details: payload,
    },
  });
  return true;
};

const emitAlert = async ({ policy, value, threshold, summary, severity = 'warning', context = {} }) => {
  const correlationId = context.correlationId || getCorrelationId() || 'missing-correlation-id';
  const payload = { policy, value, threshold, severity, summary, correlationId, context };
  incrementCounter('tii_alerts_emitted_total', 1, { policy, severity });

  try {
    await Promise.allSettled([
      sendToSlack(`[${severity.toUpperCase()}] ${summary} | correlationId=${correlationId}`),
      sendToWebhook(payload),
      sendToPagerDuty(payload),
    ]);
  } catch (error) {
    logger.warn({ err: error?.message, payload: sanitizeSecrets(payload) }, 'Failed sending one or more alerts');
  }

  logger.warn(sanitizeSecrets(payload), 'Operational alert emitted');
  return payload;
};

export { DEFAULT_THRESHOLDS, evaluateThresholds, emitAlert };
