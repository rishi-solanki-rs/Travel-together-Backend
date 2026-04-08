import { randomUUID } from 'node:crypto';
import { runWithContext } from '../shared/context/requestContext.js';

const CORRELATION_HEADER = 'x-correlation-id';

const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers[CORRELATION_HEADER] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);

  runWithContext({
    correlationId,
    requestId: correlationId,
    source: 'api',
    method: req.method,
    routePath: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || null,
  }, () => next());
};

export { CORRELATION_HEADER };
export default correlationIdMiddleware;
