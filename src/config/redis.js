import Redis from 'ioredis';
import logger from '../utils/logger.js';
import env from './env.js';
import { randomUUID } from 'crypto';
import { incrementCounter, startTimer } from '../operations/metrics/metrics.service.js';

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
    const stop = startTimer('tii_redis_duration_ms', { op: 'get' });
    try {
      const data = await getRedisClient().get(key);
      incrementCounter('tii_redis_ops_total', 1, { op: 'get' });
      incrementCounter('tii_cache_requests_total', 1, { op: 'get' });
      incrementCounter('tii_cache_hits_total', data ? 1 : 0, { op: 'get' });
      return data ? JSON.parse(data) : null;
    } catch {
      incrementCounter('tii_redis_errors_total', 1, { op: 'get' });
      return null;
    } finally {
      stop();
    }
  },
  set: async (key, value, ttlSeconds = 300) => {
    const stop = startTimer('tii_redis_duration_ms', { op: 'set' });
    try {
      await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
      incrementCounter('tii_redis_ops_total', 1, { op: 'set' });
    } catch { /* silent - cache miss is acceptable */ }
    finally { stop(); }
  },
  del: async (key) => {
    const stop = startTimer('tii_redis_duration_ms', { op: 'del' });
    try {
      await getRedisClient().del(key);
      incrementCounter('tii_redis_ops_total', 1, { op: 'del' });
    } catch { /* silent */ }
    finally { stop(); }
  },
  delPattern: async (pattern) => {
    const stop = startTimer('tii_redis_duration_ms', { op: 'delPattern' });
    try {
      const keys = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await getRedisClient().scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = nextCursor;
        if (batch && batch.length) keys.push(...batch);
      } while (cursor !== '0');
      if (keys.length) {
        const chunkSize = 500;
        for (let idx = 0; idx < keys.length; idx += chunkSize) {
          const chunk = keys.slice(idx, idx + chunkSize);
          await getRedisClient().del(...chunk);
        }
      }
      incrementCounter('tii_redis_ops_total', 1, { op: 'delPattern' });
      return keys.length;
    } catch { /* silent */ }
    finally { stop(); }
    return 0;
  },
  invalidateBroad: async (prefixes = []) => {
    if (!Array.isArray(prefixes) || !prefixes.length) return 0;
    let total = 0;
    for (const prefix of prefixes) {
      const pattern = `${prefix}*`;
      total += await cache.delPattern(pattern);
    }
    return total;
  },
};

const acquireDistributedLock = async (key, ttlSeconds = 60, ownerId = randomUUID()) => {
  try {
    const response = await getRedisClient().set(key, ownerId, 'EX', ttlSeconds, 'NX');
    return { acquired: response === 'OK', ownerId };
  } catch (error) {
    logger.warn({ err: error?.message, key }, 'Failed to acquire distributed lock');
    return { acquired: false, ownerId, error };
  }
};

const releaseDistributedLock = async (key, ownerId) => {
  try {
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
    `;
    const released = await getRedisClient().eval(script, 1, key, ownerId);
    return released === 1;
  } catch (error) {
    logger.warn({ err: error?.message, key }, 'Failed to release distributed lock');
    return false;
  }
};

const withDistributedLock = async (key, handler, options = {}) => {
  const ttlSeconds = Number.isFinite(options.ttlSeconds) ? options.ttlSeconds : 60;
  const ownerId = options.ownerId || randomUUID();
  const lock = await acquireDistributedLock(key, ttlSeconds, ownerId);
  if (!lock.acquired) {
    if (typeof options.onLocked === 'function') {
      options.onLocked({ key, ownerId: lock.ownerId, error: lock.error || null });
    }
    return { executed: false, locked: true };
  }

  try {
    const value = await handler({ key, ownerId: lock.ownerId, ttlSeconds });
    return { executed: true, locked: false, value };
  } finally {
    await releaseDistributedLock(key, lock.ownerId);
  }
};

export { getRedisClient, cache, acquireDistributedLock, releaseDistributedLock, withDistributedLock };
