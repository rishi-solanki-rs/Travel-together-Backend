import ApiError from '../utils/ApiError.js';
import { USER_ROLES } from '../shared/constants/index.js';
import {
  hasPermission as hasDynamicPermission,
  enforceVendorOwnership,
  enforceScopedAccess,
  validateBreakGlass,
  isElevationActive,
} from '../operations/security/accessGovernance.service.js';

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!allowedRoles.includes(req.user.role)) {
    throw ApiError.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  next();
};

const hasPermission = (permission) => async (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN].includes(req.user.role);
  if (isAdmin) return next();

  const allowed = await hasDynamicPermission(req.user, permission);
  if (allowed) return next();

  const breakGlassAllowed = await validateBreakGlass({ req, user: req.user, permission });
  if (breakGlassAllowed) return next();

  if (!req.user.permissions.includes(permission)) {
    throw ApiError.forbidden(`Missing permission: ${permission}`);
  }
  next();
};

const isSuperAdmin = authorize(USER_ROLES.SUPER_ADMIN);

const isAdmin = authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN);

const isVendor = authorize(
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CITY_ADMIN,
  USER_ROLES.VENDOR_ADMIN,
  USER_ROLES.VENDOR_STAFF
);

const isVendorAdmin = authorize(
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CITY_ADMIN,
  USER_ROLES.VENDOR_ADMIN
);

const isOwnVendor = (req, res, next) => {
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN].includes(req.user.role);
  if (isAdmin) return next();
  const vendorId = req.params.vendorId || req.body.vendorId;
  const ownerOk = enforceVendorOwnership({ user: req.user, vendorId });
  if (!ownerOk) {
    throw ApiError.forbidden('You do not have access to this vendor account');
  }
  next();
};

const enforceScopedAdmin = (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  const cityId = req.params.cityId || req.body.cityId || req.query.cityId;
  const categoryId = req.params.categoryId || req.body.categoryId || req.query.categoryId;
  const ok = enforceScopedAccess({ user: req.user, cityId, categoryId });
  if (!ok) throw ApiError.forbidden('Access denied for requested city/category scope');
  next();
};

const requireTemporaryElevation = (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (isElevationActive(req.user)) return next();
  throw ApiError.forbidden('Temporary elevation is required for this action');
};

export { authorize, hasPermission, isSuperAdmin, isAdmin, isVendor, isVendorAdmin, isOwnVendor, enforceScopedAdmin, requireTemporaryElevation };
