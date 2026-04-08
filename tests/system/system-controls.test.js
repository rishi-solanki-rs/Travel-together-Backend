import { jest } from '@jest/globals';

const systemSettingFindMock = jest.fn();
const systemSettingFindOneMock = jest.fn();
const systemSettingUpdateMock = jest.fn();
const invalidateBroadMock = jest.fn().mockResolvedValue(3);
const enqueueJobMock = jest.fn().mockResolvedValue({ id: 'job-1', createdAt: '2030-01-01T00:00:00.000Z' });

jest.unstable_mockModule('../../src/shared/models/SystemSetting.model.js', () => ({
  default: {
    find: systemSettingFindMock,
    findOne: systemSettingFindOneMock,
    findOneAndUpdate: systemSettingUpdateMock,
  },
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  cache: { invalidateBroad: invalidateBroadMock },
  getRedisClient: () => ({ status: 'ready' }),
}));
jest.unstable_mockModule('../../src/operations/queue/queue.service.js', () => ({ enqueueJob: enqueueJobMock, getDlqStats: jest.fn() }));
jest.unstable_mockModule('../../src/operations/metrics/metrics.service.js', () => ({ getSnapshot: jest.fn(() => ({ counters: { 'tii_cache_requests_total{op="get"}': 10, 'tii_cache_hits_total{op="get"}': 7 }, gauges: {}, histograms: {} })) }));

const { getFeatureFlags, updateFeatureFlag, getCacheOverview, refreshCache, reindexSearch, setMaintenanceMode, getSystemHealth } = await import('../../src/modules/system/system.service.js');

describe('System controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns feature flags with env defaults when no overrides exist', async () => {
    systemSettingFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const flags = await getFeatureFlags();

    expect(flags).toHaveLength(3);
    expect(flags.some((flag) => flag.key === 'slotTxAssign')).toBe(true);
  });

  test('updates a feature flag override', async () => {
    systemSettingUpdateMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ key: 'feature_flag:slotTxAssign', isEnabled: false, description: 'Transactional slot assignment pipeline', metadata: {} }) });

    const flag = await updateFeatureFlag({ key: 'slotTxAssign', enabled: false, updatedBy: 'admin-1', note: 'disable for maintenance' });

    expect(flag.enabled).toBe(false);
    expect(systemSettingUpdateMock).toHaveBeenCalled();
  });

  test('reports cache health and refresh operations', async () => {
    systemSettingFindOneMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ key: 'system:cache:lastRefreshAt', value: { refreshedAt: '2030-01-01T00:00:00.000Z', invalidatedCount: 3 }, updatedAt: '2030-01-01T00:00:00.000Z' }) });
    systemSettingUpdateMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ value: { refreshedAt: '2030-01-02T00:00:00.000Z', invalidatedCount: 3 } }) });

    const overview = await getCacheOverview();
    const refreshed = await refreshCache({ requestedBy: 'admin-1', correlationId: 'corr-1' });
    const reindexed = await reindexSearch({ requestedBy: 'admin-1', correlationId: 'corr-2' });

    expect(overview.metrics.hitRate).toBe(70);
    expect(refreshed.status).toBe('queued');
    expect(reindexed.status).toBe('queued');
    expect(enqueueJobMock).toHaveBeenCalled();
  });

  test('can toggle maintenance mode and surface health status', async () => {
    systemSettingFindMock.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    systemSettingFindOneMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ key: 'system:maintenance', isEnabled: true, value: { enabled: true, note: 'deploy window' }, updatedAt: '2030-01-01T00:00:00.000Z' }) });
    systemSettingUpdateMock.mockReturnValue({ lean: jest.fn().mockResolvedValue({ key: 'system:maintenance', isEnabled: true, value: { enabled: true, note: 'deploy window' }, updatedAt: '2030-01-01T00:00:00.000Z' }) });

    const maintenance = await setMaintenanceMode({ enabled: true, note: 'deploy window', updatedBy: 'admin-1' });
    const health = await getSystemHealth();

    expect(maintenance.enabled).toBe(true);
    expect(health.status).toBe('maintenance');
    expect(health.redis.status).toBe('ready');
  });
});
