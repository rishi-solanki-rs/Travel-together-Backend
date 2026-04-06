import Redis from 'ioredis';
import logger from '../utils/logger.js';
import env from './env.js';

let client = null;

const getRedisClient = () => {
  if (client) return client;

  client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.warn('Redis max retries exceeded — running without cache');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('error', (err) => logger.warn({ err: err.message }, 'Redis error'));

  return client;
};

const cache = {
  get: async (key) => {
    try {
      const data = await getRedisClient().get(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },
  set: async (key, value, ttlSeconds = 300) => {
    try {
      await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { /* silent - cache miss is acceptable */ }
  },
  del: async (key) => {
    try {
      await getRedisClient().del(key);
    } catch { /* silent */ }
  },
  delPattern: async (pattern) => {
    try {
      const keys = await getRedisClient().keys(pattern);
      if (keys.length) await getRedisClient().del(...keys);
    } catch { /* silent */ }
  },
};

export { getRedisClient, cache };
