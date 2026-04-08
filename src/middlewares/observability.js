import { incrementCounter, startTimer } from '../operations/metrics/metrics.service.js';

const observabilityMiddleware = (req, res, next) => {
  const stop = startTimer('tii_http_request_duration_ms', {
    method: req.method,
    route: req.path || req.originalUrl,
  });

  incrementCounter('tii_http_requests_total', 1, { method: req.method, route: req.path || req.originalUrl });

  res.on('finish', () => {
    stop();
    incrementCounter('tii_http_responses_total', 1, {
      method: req.method,
      route: req.path || req.originalUrl,
      status: res.statusCode,
    });
  });

  next();
};

export default observabilityMiddleware;
