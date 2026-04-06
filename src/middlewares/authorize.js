import ApiError from '../utils/ApiError.js';
import { USER_ROLES } from '../shared/constants/index.js';

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!allowedRoles.includes(req.user.role)) {
    throw ApiError.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  next();
};

const hasPermission = (permission) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.CITY_ADMIN].includes(req.user.role);
  if (isAdmin) return next();
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
  if (vendorId && req.user.vendorId !== vendorId) {
    throw ApiError.forbidden('You do not have access to this vendor account');
  }
  next();
};

export { authorize, hasPermission, isSuperAdmin, isAdmin, isVendor, isVendorAdmin, isOwnVendor };
