import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';
import AuthSession from '../shared/models/AuthSession.model.js';
import { isTokenRevoked } from '../operations/security/zeroTrustAuth.service.js';
import { withImpersonationAudit } from '../operations/security/accessGovernance.service.js';
import User from '../shared/models/User.model.js';
import tenantIsolation from './tenantIsolation.js';

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const revoked = await isTokenRevoked({
      tokenType: 'access',
      tokenId: decoded.tokenId || null,
      userId: decoded.id,
      sessionId: decoded.sessionId || null,
    });
    if (revoked) {
      throw ApiError.unauthorized('Access token has been revoked');
    }

    if (decoded.sessionId) {
      const session = await AuthSession.findOne({ userId: decoded.id, sessionId: decoded.sessionId, status: 'active' }).lean();
      if (!session || (session.expiresAt && new Date(session.expiresAt) < new Date())) {
        throw ApiError.unauthorized('Session is no longer active');
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      vendorId: decoded.vendorId || null,
      cityId: decoded.cityId || null,
      email: decoded.email,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId || null,
      tokenId: decoded.tokenId || null,
      elevationUntil: decoded.elevationUntil || null,
    };

    const impersonateUserId = req.headers['x-impersonate-user-id'];
    if (impersonateUserId && decoded.role === 'superAdmin') {
      const target = await User.findOne({ _id: impersonateUserId, isDeleted: false }).lean();
      if (target) {
        await withImpersonationAudit({
          actorId: decoded.id,
          impersonatedUserId: target._id,
          sessionId: decoded.sessionId || null,
          reason: req.headers['x-impersonate-reason'] || null,
        });
        req.user.impersonatedUserId = String(target._id);
      }
    }

    await tenantIsolation(req, res, () => {});
    next();
  } catch (err) {
    if (err?.statusCode) throw err;
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired. Please login again.');
    }
    if (err.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token.');
    }
    throw ApiError.unauthorized('Authentication failed.');
  }
});

const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) { return next(); }
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      vendorId: decoded.vendorId || null,
      cityId: decoded.cityId || null,
      email: decoded.email,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId || null,
    };
  } catch { /* ignore - user is just not authenticated */ }
  next();
});

export { authenticate, optionalAuthenticate };
