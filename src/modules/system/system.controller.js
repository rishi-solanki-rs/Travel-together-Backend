import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  getFeatureFlags,
  updateFeatureFlag,
  setMaintenanceMode,
  getCacheOverview,
  refreshCache,
  reindexSearch,
  getSystemHealth,
} from './system.service.js';

const healthController = asyncHandler(async (req, res) => {
  const data = await getSystemHealth();
  ApiResponse.success(res, 'System health fetched', data);
});

const featureFlagsController = asyncHandler(async (req, res) => {
  const items = await getFeatureFlags();
  ApiResponse.success(res, 'Feature flags fetched', { items });
});

const updateFeatureFlagController = asyncHandler(async (req, res) => {
  const flag = await updateFeatureFlag({
    key: req.params.key,
    enabled: req.body.enabled,
    updatedBy: req.user.id,
    note: req.body.note,
  });
  ApiResponse.success(res, 'Feature flag updated', flag);
});

const cacheController = asyncHandler(async (req, res) => {
  const data = await getCacheOverview();
  ApiResponse.success(res, 'Cache status fetched', data);
});

const refreshCacheController = asyncHandler(async (req, res) => {
  const data = await refreshCache({ requestedBy: req.user.id, correlationId: req.correlationId });
  ApiResponse.success(res, 'Cache refresh queued', data);
});

const searchReindexController = asyncHandler(async (req, res) => {
  const data = await reindexSearch({ requestedBy: req.user.id, correlationId: req.correlationId });
  ApiResponse.success(res, 'Search reindex queued', data);
});

const maintenanceController = asyncHandler(async (req, res) => {
  const data = await setMaintenanceMode({
    enabled: req.body.enabled,
    note: req.body.note,
    updatedBy: req.user.id,
  });
  ApiResponse.success(res, 'Maintenance mode updated', data);
});

export {
  healthController,
  featureFlagsController,
  updateFeatureFlagController,
  cacheController,
  refreshCacheController,
  searchReindexController,
  maintenanceController,
};
