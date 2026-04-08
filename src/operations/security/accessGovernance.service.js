import Role from '../../shared/models/Role.model.js';
import User from '../../shared/models/User.model.js';
import { USER_ROLES } from '../../shared/constants/index.js';
import { getRedisClient } from '../../config/redis.js';
import SessionRiskEvent from '../../shared/models/SessionRiskEvent.model.js';

const TTL_SECONDS = 300;

const adminLikeRoles = new Set([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CITY_ADMIN,
  'financeAdmin',
  'financeAnalyst',
]);

const resolveRolePermissions = async (roleName) => {
  const roleDoc = await Role.findOne({ name: roleName, isActive: true }).populate('permissions', 'name isActive').lean();
  if (!roleDoc) return [];
  return (roleDoc.permissions || []).filter((perm) => perm.isActive !== false).map((perm) => perm.name);
};

const getUserPermissionCacheKey = (userId) => `security:perm:user:${userId}`;

const resolveUserPermissions = async (user) => {
  if (!user) return [];
  if (adminLikeRoles.has(user.role)) return ['*'];

  const cacheKey = getUserPermissionCacheKey(user.id || user._id);
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // best effort
  }

  const [rolePermissions, directPermissions] = await Promise.all([
    resolveRolePermissions(user.role),
    Promise.resolve(Array.isArray(user.permissions) ? user.permissions : []),
  ]);

  const merged = Array.from(new Set([...rolePermissions, ...directPermissions]));

  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(merged), 'EX', TTL_SECONDS);
  } catch {
    // best effort
  }

  return merged;
};

const invalidateUserPermissions = async (userId) => {
  const cacheKey = getUserPermissionCacheKey(userId);
  try {
    await getRedisClient().del(cacheKey);
  } catch {
    // best effort
  }
};

const hasPermission = async (user, permissionName) => {
  const permissions = await resolveUserPermissions(user);
  if (permissions.includes('*')) return true;
  return permissions.includes(permissionName);
};

const enforceVendorOwnership = ({ user, vendorId }) => {
  if (!user) return false;
  if (adminLikeRoles.has(user.role)) return true;
  if (!vendorId) return true;
  return String(user.vendorId || '') === String(vendorId);
};

const enforceScopedAccess = ({ user, cityId = null, categoryId = null }) => {
  if (!user) return false;
  if (user.role === USER_ROLES.SUPER_ADMIN) return true;
  if (user.role === USER_ROLES.CITY_ADMIN) {
    return !cityId || String(user.cityId || '') === String(cityId);
  }

  if (user.role === USER_ROLES.VENDOR_ADMIN || user.role === USER_ROLES.VENDOR_STAFF) {
    if (cityId && user.cityId && String(user.cityId) !== String(cityId)) return false;
    if (categoryId && Array.isArray(user.allowedCategoryIds) && user.allowedCategoryIds.length) {
      return user.allowedCategoryIds.map(String).includes(String(categoryId));
    }
  }

  return true;
};

const validateBreakGlass = async ({ req, user, permission }) => {
  const token = req.headers['x-break-glass-token'];
  if (!token) return false;
  if (String(token) !== String(process.env.BREAK_GLASS_TOKEN || '')) return false;
  if (user.role !== USER_ROLES.SUPER_ADMIN) return false;

  await SessionRiskEvent.create({
    userId: user.id,
    sessionId: user.sessionId || null,
    eventType: 'break_glass_override',
    severity: 'critical',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || null,
    details: { permission, reason: req.headers['x-break-glass-reason'] || 'unspecified' },
  });

  return true;
};

const isElevationActive = (user) => {
  const until = user?.elevationUntil ? new Date(user.elevationUntil) : null;
  if (!until) return false;
  return until > new Date();
};

const withImpersonationAudit = async ({ actorId, impersonatedUserId, sessionId = null, reason = null }) => {
  await SessionRiskEvent.create({
    userId: actorId,
    sessionId,
    eventType: 'impersonation_started',
    severity: 'high',
    details: { impersonatedUserId, reason },
  });
};

const canWriteFinanceLedger = async ({ user, source = 'service' }) => {
  if (source !== 'api') return true;
  if (!user) return false;
  if (user.role === USER_ROLES.SUPER_ADMIN) return true;
  const allowed = await hasPermission(user, 'finance.ledger.write');
  return allowed;
};

const buildCmsRolePartition = async ({ user, action }) => {
  if (!user) return false;
  if (user.role === USER_ROLES.SUPER_ADMIN) return true;
  if (action === 'publish') return hasPermission(user, 'cms.publish');
  if (action === 'review') return hasPermission(user, 'cms.review');
  return hasPermission(user, 'cms.edit');
};

export {
  resolveUserPermissions,
  invalidateUserPermissions,
  hasPermission,
  enforceVendorOwnership,
  enforceScopedAccess,
  validateBreakGlass,
  isElevationActive,
  withImpersonationAudit,
  canWriteFinanceLedger,
  buildCmsRolePartition,
};
