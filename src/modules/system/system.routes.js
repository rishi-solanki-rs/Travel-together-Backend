import express from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { isSuperAdmin } from '../../middlewares/authorize.js';
import auditLog from '../../middlewares/auditLog.js';
import validateRequest from '../../middlewares/validateRequest.js';
import {
  healthController,
  featureFlagsController,
  updateFeatureFlagController,
  cacheController,
  refreshCacheController,
  searchReindexController,
  maintenanceController,
} from './system.controller.js';
import {
  featureFlagParamsSchema,
  featureFlagUpdateSchema,
  maintenanceUpdateSchema,
  systemActionSchema,
} from './system.validator.js';

const router = express.Router();

router.get('/health', authenticate, isSuperAdmin, healthController);
router.get('/feature-flags', authenticate, isSuperAdmin, featureFlagsController);
router.patch('/feature-flags/:key', authenticate, isSuperAdmin, validateRequest({ params: featureFlagParamsSchema, body: featureFlagUpdateSchema }), auditLog('update_feature_flag', 'system'), updateFeatureFlagController);
router.get('/cache', authenticate, isSuperAdmin, cacheController);
router.post('/cache/refresh', authenticate, isSuperAdmin, validateRequest({ body: systemActionSchema.partial() }), auditLog('refresh_cache', 'system'), refreshCacheController);
router.post('/search/reindex', authenticate, isSuperAdmin, validateRequest({ body: systemActionSchema.partial() }), auditLog('reindex_search', 'system'), searchReindexController);
router.patch('/maintenance', authenticate, isSuperAdmin, validateRequest({ body: maintenanceUpdateSchema }), auditLog('set_maintenance_mode', 'system'), maintenanceController);

export default router;
