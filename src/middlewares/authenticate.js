import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

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
    req.user = {
      id: decoded.id,
      role: decoded.role,
      vendorId: decoded.vendorId || null,
      email: decoded.email,
      permissions: decoded.permissions || [],
    };
    next();
  } catch (err) {
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
    req.user = { id: decoded.id, role: decoded.role, vendorId: decoded.vendorId || null, email: decoded.email, permissions: decoded.permissions || [] };
  } catch { /* ignore - user is just not authenticated */ }
  next();
});

export { authenticate, optionalAuthenticate };
