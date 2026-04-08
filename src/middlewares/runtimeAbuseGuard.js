import ApiError from '../utils/ApiError.js';
import { detectBotSpike } from '../operations/security/runtimeSecurity.service.js';

const requestsByIp = new Map();
const WINDOW_MS = 60 * 1000;

const runtimeAbuseGuard = (req, res, next) => {
  const maxBodyBytes = Number(process.env.MAX_REQUEST_BODY_BYTES || 10 * 1024 * 1024);
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > maxBodyBytes) {
    throw ApiError.unprocessable('Request body too large for security policy');
  }

  const rssMb = process.memoryUsage().rss / (1024 * 1024);
  const maxRssMb = Number(process.env.MAX_RUNTIME_RSS_MB || 1024);
  if (rssMb > maxRssMb) {
    throw ApiError.unprocessable('Runtime memory protection triggered');
  }

  const now = Date.now();
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
  const bucket = requestsByIp.get(ip) || { count: 0, startedAt: now };
  if (now - bucket.startedAt > WINDOW_MS) {
    bucket.count = 0;
    bucket.startedAt = now;
  }
  bucket.count += 1;
  requestsByIp.set(ip, bucket);

  const suspicious = detectBotSpike({ requestCount: bucket.count, uniqueIps: requestsByIp.size });
  if (suspicious) {
    throw ApiError.tooMany('Bot spike detected by runtime guard');
  }

  next();
};

export default runtimeAbuseGuard;
