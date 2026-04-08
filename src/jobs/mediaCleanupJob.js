import MediaAsset from '../shared/models/MediaAsset.model.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { withDistributedLock } from '../config/redis.js';
import { deleteImageWithRetry } from '../utils/cloudinaryHelper.js';
import { enqueueJob } from '../operations/queue/queue.service.js';
import { emitAlert } from '../operations/alerts/alerting.service.js';

const CLEANUP_LOCK_KEY = 'cron:mediaCleanupJob:lock';

const runCleanupCore = async ({ dryRun = env.MEDIA_CLEANUP_DRY_RUN } = {}) => {
  const now = new Date();
  const eligible = await MediaAsset.find({
    isDeleted: true,
    cleanupEligibleAt: { $ne: null, $lte: now },
    lifecycleStatus: { $in: ['pending_delete', 'delete_failed', 'orphaned'] },
    deleteRetryCount: { $lt: env.MEDIA_DELETE_MAX_RETRIES },
  }).select('_id publicId deleteRetryCount bytes lifecycleStatus').lean();

  let deletedInCloudinary = 0;
  let failedDeletes = 0;
  let reclaimedBytes = 0;

  for (const asset of eligible) {
    if (dryRun) continue;
    try {
      await deleteImageWithRetry(asset.publicId, {
        maxRetries: 2,
        baseDelayMs: 400,
      });
      await MediaAsset.findByIdAndUpdate(asset._id, {
        $set: {
          lifecycleStatus: 'deleted',
          deletedAt: now,
          isActive: false,
        },
      });
      deletedInCloudinary += 1;
      reclaimedBytes += asset.bytes || 0;
    } catch {
      failedDeletes += 1;
      await MediaAsset.findByIdAndUpdate(asset._id, {
        $set: {
          lifecycleStatus: 'delete_failed',
          cleanupEligibleAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
        $inc: {
          deleteRetryCount: 1,
        },
      });
      await enqueueJob('media-cleanup-retries', 'retry-delete', {
        mediaAssetId: String(asset._id),
        publicId: asset.publicId,
      }, { maxAttempts: 5, poisonThreshold: 7 });
    }
  }

  if (failedDeletes > 0) {
    await emitAlert({
      policy: 'failed-delete-retries',
      value: failedDeletes,
      threshold: env.ALERT_DELETE_RETRY_THRESHOLD,
      summary: `Media cleanup has ${failedDeletes} failed delete retries`,
      severity: 'warning',
      context: { failedDeletes },
    });
  }

  const graceThreshold = new Date(now.getTime() - (env.MEDIA_CLEANUP_GRACE_HOURS * 60 * 60 * 1000));
  let purgedDocuments = 0;

  if (!dryRun) {
    const purgeResult = await MediaAsset.deleteMany({
      isDeleted: true,
      lifecycleStatus: 'deleted',
      deletedAt: { $lte: graceThreshold },
    });
    purgedDocuments = purgeResult.deletedCount || 0;
  }

  return {
    dryRun,
    scannedForDeleteCount: eligible.length,
    deletedInCloudinary,
    failedDeletes,
    retryQueueDepth: await MediaAsset.countDocuments({ lifecycleStatus: 'delete_failed', isDeleted: true }),
    orphanCandidateCount: await MediaAsset.countDocuments({ orphanCandidate: true, isDeleted: false }),
    staleUnusedAssetCount: await MediaAsset.countDocuments({
      isDeleted: false,
      lastAccessedAt: { $ne: null, $lte: graceThreshold },
    }),
    reclaimedBytes,
    purgedDocuments,
  };
};

const run = async (options = {}) => {
  const lock = await withDistributedLock(CLEANUP_LOCK_KEY, async () => {
    const result = await runCleanupCore(options);
    logger.info({ result }, 'mediaCleanupJob complete');
    return result;
  }, {
    ttlSeconds: 300,
    onLocked: () => logger.warn('mediaCleanupJob skipped due to active lock'),
  });

  if (!lock.executed) {
    return { executed: false, locked: true };
  }

  return lock.value;
};

export { runCleanupCore, run };
