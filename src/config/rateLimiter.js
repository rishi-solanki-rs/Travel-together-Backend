import rateLimit from 'express-rate-limit';
import env from './env.js';

const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Upload limit exceeded. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

export { defaultLimiter, authLimiter, uploadLimiter };
