import logger from '../utils/logger.js';
import { withDistributedLock } from '../config/redis.js';
import { applyRetentionPolicies } from '../operations/security/privacyCompliance.service.js';

const run = async () => {
  const lock = await withDistributedLock('cron:privacyRetentionJob:lock', async () => {
    const result = await applyRetentionPolicies();
    logger.info({ result }, 'privacyRetentionJob completed');
    return result;
  }, {
    ttlSeconds: 300,
    onLocked: () => logger.warn('privacyRetentionJob skipped due to active lock'),
  });

  if (!lock.executed) {
    return { executed: false, locked: true };
  }

  return lock.value;
};

export { run };
