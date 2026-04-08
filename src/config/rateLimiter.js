import rateLimit from 'express-rate-limit';
import env from './env.js';

const detectTier = (req) => {
  if (req.headers['x-step-up'] === 'true') return 'elevated';
  if (req.user?.role === 'superAdmin' || req.user?.role === 'cityAdmin') return 'admin';
  return 'default';
};

const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: (req) => {
    const tier = detectTier(req);
    if (tier === 'admin') return Math.max(env.RATE_LIMIT_MAX, 1000);
    if (tier === 'elevated') return Math.max(20, Math.floor(env.RATE_LIMIT_MAX / 2));
    return env.RATE_LIMIT_MAX;
  },
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
  max: (req) => {
    const suspicious = String(req.headers['x-bot-suspect'] || '').toLowerCase() === 'true';
    if (suspicious) return Math.max(2, Math.floor(env.AUTH_RATE_LIMIT_MAX / 5));
    return env.AUTH_RATE_LIMIT_MAX;
  },
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
