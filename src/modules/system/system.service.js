import mongoose from 'mongoose';
import env from '../../config/env.js';
import { cache, getRedisClient } from '../../config/redis.js';
import { getSnapshot } from '../../operations/metrics/metrics.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import SystemSetting from '../../shared/models/SystemSetting.model.js';

const FEATURE_FLAG_DEFINITIONS = [
  {
    key: 'slotTxAssign',
    description: 'Transactional slot assignment pipeline',
    enabled: env.FF_SLOT_TX_ASSIGN,
  },
  {
    key: 'pagesBatchEnrich',
    description: 'Batch page enrichment for discovery views',
    enabled: env.FF_PAGES_BATCH_ENRICH,
  },
  {
    key: 'uploadStreamMode',
    description: 'Streaming upload pipeline',
    enabled: env.FF_UPLOAD_STREAM_MODE,
  },
];

const SETTINGS = {
  maintenance: 'system:maintenance',
  cacheRefresh: 'system:cache:lastRefreshAt',
  searchReindex: 'system:search:lastReindexAt',
};

const sumMetric = (snapshot, metricName) => Object.entries(snapshot?.counters || {})
  .filter(([key]) => key.startsWith(metricName))
  .reduce((acc, [, value]) => acc + Number(value || 0), 0);

const readSetting = async (key) => SystemSetting.findOne({ key }).lean();

const upsertSetting = async ({ key, category, description = null, value = null, isEnabled = true, updatedBy = null, metadata = {} }) => {
  return SystemSetting.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        category,
        description,
        value,
        isEnabled,
        updatedBy,
        metadata,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
};

const normalizeFeatureFlag = (definition, override = null) => ({
  key: definition.key,
  enabled: override?.isEnabled ?? definition.enabled,
  description: override?.description || definition.description,
  source: override ? 'database' : 'env',
  updatedAt: override?.updatedAt || null,
  metadata: override?.metadata || {},
});

const getFeatureFlags = async () => {
  const overrideKeys = FEATURE_FLAG_DEFINITIONS.map((definition) => `feature_flag:${definition.key}`);
  const overrides = await SystemSetting.find({ key: { $in: overrideKeys } }).lean();
  const overridesByKey = new Map(overrides.map((entry) => [String(entry.key).replace('feature_flag:', ''), entry]));
  return FEATURE_FLAG_DEFINITIONS.map((definition) => normalizeFeatureFlag(definition, overridesByKey.get(definition.key)));
};

const updateFeatureFlag = async ({ key, enabled, updatedBy = null, note = null }) => {
  const definition = FEATURE_FLAG_DEFINITIONS.find((entry) => entry.key === key);
  const setting = await upsertSetting({
    key: `feature_flag:${key}`,
    category: 'feature_flag',
    description: definition?.description || note || null,
    value: { enabled: Boolean(enabled), note: note || null },
    isEnabled: Boolean(enabled),
    updatedBy,
    metadata: { definitionKey: key },
  });
  return normalizeFeatureFlag(definition || { key, description: note || '' , enabled: Boolean(enabled) }, setting);
};

const getMaintenanceState = async () => {
  const setting = await readSetting(SETTINGS.maintenance);
  return {
    enabled: Boolean(setting?.isEnabled ?? setting?.value?.enabled ?? false),
    note: setting?.value?.note || null,
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
};

const setMaintenanceMode = async ({ enabled, note = null, updatedBy = null }) => {
  const setting = await upsertSetting({
    key: SETTINGS.maintenance,
    category: 'maintenance',
    description: 'Superadmin maintenance mode',
    value: { enabled: Boolean(enabled), note: note || null },
    isEnabled: Boolean(enabled),
    updatedBy,
    metadata: { note: note || null },
  });

  return {
    enabled: Boolean(setting?.isEnabled ?? enabled),
    note: setting?.value?.note || note || null,
    updatedAt: setting?.updatedAt || null,
    updatedBy: setting?.updatedBy || null,
  };
};

const getCacheOverview = async () => {
  const snapshot = getSnapshot();
  const requests = sumMetric(snapshot, 'tii_cache_requests_total');
  const hits = sumMetric(snapshot, 'tii_cache_hits_total');
  const redisClient = getRedisClient();
  const refreshSetting = await readSetting(SETTINGS.cacheRefresh);

  return {
    status: redisClient.status || 'unknown',
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      db: env.REDIS_DB,
      status: redisClient.status || 'unknown',
    },
    metrics: {
      requests,
      hits,
      hitRate: requests > 0 ? Number(((hits / requests) * 100).toFixed(2)) : 0,
    },
    lastRefreshAt: refreshSetting?.value?.refreshedAt || refreshSetting?.updatedAt || null,
    invalidatedCount: Number(refreshSetting?.value?.invalidatedCount || 0),
  };
};

const refreshCache = async ({ requestedBy = null, correlationId = null }) => {
  const invalidatedCount = await cache.invalidateBroad([
    'listing:',
    'search:',
    'pages:',
    'cms:',
    'analytics:',
    'notifications:',
    'bookings:',
    'slots:',
  ]);

  const setting = await upsertSetting({
    key: SETTINGS.cacheRefresh,
    category: 'cache',
    description: 'Last cache refresh',
    value: {
      refreshedAt: new Date().toISOString(),
      invalidatedCount,
      requestedBy,
      correlationId,
    },
    isEnabled: true,
    updatedBy: requestedBy,
    metadata: { correlationId },
  });

  return {
    status: 'queued',
    invalidatedCount,
    refreshedAt: setting?.value?.refreshedAt || new Date().toISOString(),
  };
};

const reindexSearch = async ({ requestedBy = null, correlationId = null }) => {
  const job = await enqueueJob('search', 'search-reindex', { requestedBy, correlationId }, { correlationId, maxAttempts: 1 });
  const setting = await upsertSetting({
    key: SETTINGS.searchReindex,
    category: 'search',
    description: 'Last search reindex request',
    value: {
      reindexedAt: new Date().toISOString(),
      jobId: job.id,
      requestedBy,
      correlationId,
    },
    isEnabled: true,
    updatedBy: requestedBy,
    metadata: { jobId: job.id, correlationId },
  });

  return {
    status: 'queued',
    jobId: job.id,
    queuedAt: setting?.value?.reindexedAt || new Date().toISOString(),
  };
};

const getSystemHealth = async () => {
  const [featureFlags, maintenance, cacheOverview] = await Promise.all([
    getFeatureFlags(),
    getMaintenanceState(),
    getCacheOverview(),
  ]);

  const dbReadyState = mongoose.connection.readyState;
  const databaseStatus = dbReadyState === 1 ? 'connected' : dbReadyState === 2 ? 'connecting' : 'disconnected';
  const redisStatus = cacheOverview.status || 'unknown';
  const metricsSnapshot = getSnapshot();
  const memoryMb = Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2));

  const status = maintenance.enabled
    ? 'maintenance'
    : databaseStatus === 'connected' && redisStatus === 'ready'
      ? 'healthy'
      : 'degraded';

  return {
    status,
    service: env.APP_NAME,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    memoryMb,
    database: {
      status: databaseStatus,
      readyState: dbReadyState,
    },
    redis: {
      status: redisStatus,
    },
    maintenance,
    featureFlags,
    cache: cacheOverview,
    metrics: {
      counters: Object.keys(metricsSnapshot.counters || {}).length,
      gauges: Object.keys(metricsSnapshot.gauges || {}).length,
      histograms: Object.keys(metricsSnapshot.histograms || {}).length,
    },
  };
};

export {
  getFeatureFlags,
  updateFeatureFlag,
  getMaintenanceState,
  setMaintenanceMode,
  getCacheOverview,
  refreshCache,
  reindexSearch,
  getSystemHealth,
};
