import ProductItem from '../../shared/models/ProductItem.model.js';
import MediaAsset from '../../shared/models/MediaAsset.model.js';
import ReconciliationRun from '../../shared/models/ReconciliationRun.model.js';
import { detectSubscriptionSlotMismatches } from '../../modules/slots/slots.service.js';
import { getDlqStats } from '../queue/queue.service.js';
import { getSnapshot } from '../metrics/metrics.service.js';
import { evaluateThresholds, emitAlert } from './alerting.service.js';

const parseCounter = (snapshot, metricName, labelFragment = '') => {
  const counters = snapshot?.counters || {};
  return Object.entries(counters).reduce((acc, [key, value]) => {
    if (!key.startsWith(metricName)) return acc;
    if (labelFragment && !key.includes(labelFragment)) return acc;
    return acc + Number(value || 0);
  }, 0);
};

const parseHistogramMax = (snapshot, metricName, labelFragment = '') => {
  const histograms = snapshot?.histograms || {};
  return Object.entries(histograms).reduce((acc, [key, value]) => {
    if (!key.startsWith(metricName)) return acc;
    if (labelFragment && !key.includes(labelFragment)) return acc;
    return Math.max(acc, Number(value?.max || 0));
  }, 0);
};

const buildOperationalSnapshot = async () => {
  const [negativeInventory, slotMismatches, latestReconciliation, dlq, failedDeleteRetries] = await Promise.all([
    ProductItem.countDocuments({ stock: { $lt: 0 }, isDeleted: false }),
    detectSubscriptionSlotMismatches({}).then((rows) => rows.length),
    ReconciliationRun.findOne({}).sort({ createdAt: -1 }).lean(),
    getDlqStats(),
    MediaAsset.countDocuments({ lifecycleStatus: 'delete_failed', isDeleted: true }),
  ]);

  const metricsSnapshot = getSnapshot();
  const bookingFailures = parseCounter(metricsSnapshot, 'tii_queue_failures_total', 'job="hotel-booking-confirmed"')
    + parseCounter(metricsSnapshot, 'tii_queue_failures_total', 'job="tour-reservation-confirmed"')
    + parseCounter(metricsSnapshot, 'tii_queue_failures_total', 'job="kids-session-booking-confirmed"');

  const duplicateCheckoutSpikes = parseCounter(metricsSnapshot, 'tii_duplicate_checkout_total');
  const homepageP95Ms = parseHistogramMax(metricsSnapshot, 'tii_http_request_duration_ms', 'route="/api/v1/pages/home"');

  return {
    negativeInventory,
    slotMismatch: slotMismatches,
    paymentMismatch: Number(latestReconciliation?.stats?.duplicatePayments || 0),
    reconciliationDrift: Math.abs(Number(latestReconciliation?.stats?.driftAmount || 0)),
    dlqGrowth: Number(dlq.total || 0),
    failedDeleteRetries,
    homepageP95Ms,
    bookingFailures,
    duplicateCheckoutSpikes,
    memoryPressureMb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2)),
  };
};

const runSafetyChecks = async () => {
  const snapshot = await buildOperationalSnapshot();
  const breaches = evaluateThresholds(snapshot);

  for (const breach of breaches) {
    await emitAlert({
      policy: breach.key,
      value: breach.value,
      threshold: breach.threshold,
      summary: `Operational threshold breached for ${breach.key}`,
      severity: breach.key === 'memoryPressureMb' || breach.key === 'negativeInventory' ? 'critical' : 'warning',
      context: { snapshot },
    });
  }

  return { snapshot, breaches };
};

export { buildOperationalSnapshot, runSafetyChecks };
