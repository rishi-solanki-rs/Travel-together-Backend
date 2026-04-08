import ListingBase from '../shared/models/ListingBase.model.js';
import Vendor from '../shared/models/Vendor.model.js';
import CMSSection from '../shared/models/CMSSection.model.js';
import Page from '../shared/models/Page.model.js';
import HotelRoom from '../shared/models/HotelRoom.model.js';
import MediaAsset from '../shared/models/MediaAsset.model.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { withDistributedLock } from '../config/redis.js';
import { extractCloudinaryPublicId } from '../utils/cloudinaryHelper.js';

const ORPHAN_LOCK_KEY = 'cron:mediaOrphanReconciliationJob:lock';

const addPublicId = (set, value) => {
  if (value && typeof value === 'string') set.add(value);
};

const collectPublicIdsFromListings = async (set) => {
  const docs = await ListingBase.find({ isDeleted: false }).select('coverImage galleryImages').lean();
  docs.forEach((doc) => {
    addPublicId(set, doc?.coverImage?.publicId);
    (doc?.galleryImages || []).forEach((img) => addPublicId(set, img?.publicId));
  });
};

const collectPublicIdsFromVendors = async (set) => {
  const docs = await Vendor.find({ isDeleted: false }).select('logo coverImage galleryImages').lean();
  docs.forEach((doc) => {
    addPublicId(set, doc?.logo?.publicId);
    addPublicId(set, doc?.coverImage?.publicId);
    (doc?.galleryImages || []).forEach((img) => addPublicId(set, img?.publicId));
  });
};

const collectPublicIdsFromCmsSections = async (set) => {
  const docs = await CMSSection.find({ isDeleted: false }).select('desktopImages mobileImages').lean();
  docs.forEach((doc) => {
    (doc?.desktopImages || []).forEach((img) => addPublicId(set, img?.publicId));
    (doc?.mobileImages || []).forEach((img) => addPublicId(set, img?.publicId));
  });
};

const collectPublicIdsFromPages = async (set) => {
  const docs = await Page.find({ isDeleted: false }).select('seoConfig.ogImage').lean();
  docs.forEach((doc) => {
    const publicId = extractCloudinaryPublicId(doc?.seoConfig?.ogImage || '');
    addPublicId(set, publicId);
  });
};

const collectPublicIdsFromSuiteGalleries = async (set) => {
  const docs = await HotelRoom.find({ isDeleted: false }).select('images').lean();
  docs.forEach((doc) => {
    (doc?.images || []).forEach((img) => addPublicId(set, img?.publicId));
  });
};

const getDuplicateAssetGroups = async () => {
  const groups = await MediaAsset.aggregate([
    {
      $match: {
        isDeleted: false,
        checksum: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$checksum',
        count: { $sum: 1 },
        totalBytes: { $sum: { $ifNull: ['$bytes', 0] } },
        assetIds: { $push: '$_id' },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  const duplicateAssetCount = groups.reduce((acc, group) => acc + Math.max(group.count - 1, 0), 0);
  const reclaimableBytes = groups.reduce((acc, group) => {
    if (group.count <= 1) return acc;
    const avgBytes = group.totalBytes / group.count;
    return acc + Math.max(group.count - 1, 0) * avgBytes;
  }, 0);

  return {
    groups,
    duplicateAssetCount,
    reclaimableBytes,
  };
};

const reconcileOrphansCore = async ({ dryRun = env.MEDIA_CLEANUP_DRY_RUN } = {}) => {
  const referencedPublicIds = new Set();

  await Promise.all([
    collectPublicIdsFromListings(referencedPublicIds),
    collectPublicIdsFromVendors(referencedPublicIds),
    collectPublicIdsFromCmsSections(referencedPublicIds),
    collectPublicIdsFromPages(referencedPublicIds),
    collectPublicIdsFromSuiteGalleries(referencedPublicIds),
  ]);

  const assets = await MediaAsset.find({ isDeleted: false }).select('_id publicId lifecycleStatus isOrphaned').lean();
  const orphanAssetIds = [];
  const activeAssetIds = [];

  assets.forEach((asset) => {
    if (!referencedPublicIds.has(asset.publicId)) {
      orphanAssetIds.push(asset._id);
    } else {
      activeAssetIds.push(asset._id);
    }
  });

  const now = new Date();
  const cleanupEligibleAt = new Date(now.getTime() + env.MEDIA_CLEANUP_GRACE_HOURS * 60 * 60 * 1000);

  if (!dryRun) {
    if (orphanAssetIds.length) {
      await MediaAsset.updateMany(
        { _id: { $in: orphanAssetIds } },
        {
          $set: {
            isOrphaned: true,
            orphanCandidate: true,
            lifecycleStatus: 'orphaned',
            cleanupRequestedAt: now,
            cleanupEligibleAt,
          },
        }
      );
    }

    if (activeAssetIds.length) {
      await MediaAsset.updateMany(
        { _id: { $in: activeAssetIds } },
        {
          $set: {
            isOrphaned: false,
            orphanCandidate: false,
            lifecycleStatus: 'active',
          },
        }
      );
    }
  }

  const duplicates = await getDuplicateAssetGroups();

  return {
    dryRun,
    scannedAssetCount: assets.length,
    referencedPublicIdCount: referencedPublicIds.size,
    orphanCount: orphanAssetIds.length,
    activeCount: activeAssetIds.length,
    duplicateGroupCount: duplicates.groups.length,
    duplicateAssetCount: duplicates.duplicateAssetCount,
    reclaimableBytesEstimate: Math.round(duplicates.reclaimableBytes),
    duplicateGroups: duplicates.groups,
  };
};

const run = async (options = {}) => {
  const lock = await withDistributedLock(ORPHAN_LOCK_KEY, async () => {
    const result = await reconcileOrphansCore(options);
    logger.info({ result }, 'mediaOrphanReconciliationJob complete');
    return result;
  }, {
    ttlSeconds: 300,
    onLocked: () => logger.warn('mediaOrphanReconciliationJob skipped due to active lock'),
  });

  if (!lock.executed) {
    return { executed: false, locked: true };
  }

  return lock.value;
};

export { reconcileOrphansCore, getDuplicateAssetGroups, run };
