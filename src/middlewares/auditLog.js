import AuditLog from '../shared/models/AuditLog.model.js';
import logger from '../utils/logger.js';

const auditLog = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  let responseData = null;

  res.json = (data) => {
    responseData = data;
    return originalJson(data);
  };

  res.on('finish', async () => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        await AuditLog.create({
          action,
          resource,
          resourceId: req.params.id || responseData?.data?._id || null,
          performedBy: req.user.id,
          performedByRole: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: res.statusCode,
          metadata: {
            body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
            params: req.params,
          },
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to write audit log');
      }
    }
  });

  next();
};

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  ['password', 'token', 'secret', 'apiKey', 'refreshToken'].forEach(key => {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  });
  return sanitized;
};

export default auditLog;
