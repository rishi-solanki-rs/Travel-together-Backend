import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} — ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} — ${res.statusCode} — ${err.message}`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/api/v1/health',
  },
});

export default requestLogger;
