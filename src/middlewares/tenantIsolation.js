import ApiError from '../utils/ApiError.js';
import { USER_ROLES } from '../shared/constants/index.js';
import { enforceVendorOwnership, enforceScopedAccess } from '../operations/security/accessGovernance.service.js';
import { recordAuditEvent } from '../operations/audit/audit.service.js';

const extractVendorId = (req) => req.params.vendorId || req.body.vendorId || req.query.vendorId || null;
const extractCityId = (req) => req.params.cityId || req.body.cityId || req.query.cityId || null;
const extractCategoryId = (req) => req.params.categoryId || req.body.categoryId || req.query.categoryId || null;

const tenantIsolation = async (req, res, next) => {
  if (!req.user) return next();

  const isInternalAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN].includes(req.user.role);
  const vendorId = extractVendorId(req);
  const cityId = extractCityId(req);
  const categoryId = extractCategoryId(req);

  const ownerOk = enforceVendorOwnership({ user: req.user, vendorId });
  const scopeOk = enforceScopedAccess({ user: req.user, cityId, categoryId });

  if (!ownerOk || !scopeOk) {
    throw ApiError.forbidden('Cross-tenant access blocked by isolation policy');
  }

  if (isInternalAdmin && (vendorId || cityId || categoryId)) {
    await recordAuditEvent({
      eventType: 'tenant.admin_scoped_bypass',
      module: 'security',
      entityType: 'TenantScope',
      entityId: vendorId || cityId || categoryId || 'none',
      action: 'admin-bypass',
      actor: { actorType: 'admin', actorId: req.user.id, vendorId: req.user.vendorId || null },
      context: { correlationId: req.correlationId, source: 'api', module: 'security' },
      metadata: { vendorId, cityId, categoryId, method: req.method, path: req.originalUrl },
    });
  }

  next();
};

export default tenantIsolation;
