import pino from 'pino';
import env from '../config/env.js';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
    : undefined,
  base: { service: 'together-in-india-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.token'],
    censor: '[REDACTED]',
  },
});

export default logger;
