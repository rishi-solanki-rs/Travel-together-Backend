import { jest } from '@jest/globals';

const listingFind = jest.fn();
const vendorFind = jest.fn();
const cmsFind = jest.fn();
const pageFind = jest.fn();
const roomFind = jest.fn();
const mediaFind = jest.fn();
const mediaUpdateMany = jest.fn();
const mediaAggregate = jest.fn();
const mediaCountDocuments = jest.fn();
const mediaDeleteMany = jest.fn();
const mediaFindByIdAndUpdate = jest.fn();
const deleteImageWithRetry = jest.fn();
const enqueueJob = jest.fn();

const chain = (rows) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(rows),
  }),
});

jest.unstable_mockModule('../../src/shared/models/ListingBase.model.js', () => ({
  default: { find: listingFind },
}));

jest.unstable_mockModule('../../src/shared/models/Vendor.model.js', () => ({
  default: { find: vendorFind },
}));

jest.unstable_mockModule('../../src/shared/models/CMSSection.model.js', () => ({
  default: { find: cmsFind },
}));

jest.unstable_mockModule('../../src/shared/models/Page.model.js', () => ({
  default: { find: pageFind },
}));

jest.unstable_mockModule('../../src/shared/models/HotelRoom.model.js', () => ({
  default: { find: roomFind },
}));

jest.unstable_mockModule('../../src/shared/models/MediaAsset.model.js', () => ({
  default: {
    find: mediaFind,
    updateMany: mediaUpdateMany,
    aggregate: mediaAggregate,
    countDocuments: mediaCountDocuments,
    deleteMany: mediaDeleteMany,
    findByIdAndUpdate: mediaFindByIdAndUpdate,
  },
}));

jest.unstable_mockModule('../../src/utils/cloudinaryHelper.js', () => ({
  deleteImageWithRetry,
  extractCloudinaryPublicId: jest.fn(() => null),
}));

jest.unstable_mockModule('../../src/operations/queue/queue.service.js', () => ({
  enqueueJob,
}));

const { reconcileOrphansCore } = await import('../../src/jobs/mediaOrphanReconciliationJob.js');
const { runCleanupCore } = await import('../../src/jobs/mediaCleanupJob.js');

describe('Phase 5 media lifecycle jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    listingFind.mockReturnValue(chain([
      { coverImage: { publicId: 'p1' }, galleryImages: [] },
    ]));
    vendorFind.mockReturnValue(chain([]));
    cmsFind.mockReturnValue(chain([]));
    pageFind.mockReturnValue(chain([]));
    roomFind.mockReturnValue(chain([]));

    mediaFind.mockReturnValue(chain([
      { _id: 'a1', publicId: 'p1', lifecycleStatus: 'active', isOrphaned: false },
      { _id: 'a2', publicId: 'p2', lifecycleStatus: 'active', isOrphaned: false },
    ]));

    mediaAggregate.mockResolvedValue([]);
    mediaCountDocuments.mockResolvedValue(0);
    mediaDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mediaFindByIdAndUpdate.mockResolvedValue(null);
    deleteImageWithRetry.mockResolvedValue({ result: 'ok' });
  });

  test('6) orphan asset scan identifies unreferenced media in dry-run', async () => {
    const result = await reconcileOrphansCore({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.orphanCount).toBe(1);
    expect(result.activeCount).toBe(1);
    expect(mediaUpdateMany).not.toHaveBeenCalled();
  });

  test('7) stale asset cleanup supports dry-run mode', async () => {
    mediaFind.mockReturnValue(chain([
      {
        _id: 'a10',
        publicId: 'stale/public',
        deleteRetryCount: 0,
        bytes: 4096,
        lifecycleStatus: 'delete_failed',
      },
    ]));

    const result = await runCleanupCore({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.scannedForDeleteCount).toBe(1);
    expect(deleteImageWithRetry).not.toHaveBeenCalled();
  });

  test('8) failed delete path increments retry counters', async () => {
    mediaFind.mockReturnValue(chain([
      {
        _id: 'a20',
        publicId: 'broken/public',
        deleteRetryCount: 0,
        bytes: 2048,
        lifecycleStatus: 'delete_failed',
      },
    ]));
    deleteImageWithRetry.mockRejectedValue(new Error('cloudinary timeout'));

    const result = await runCleanupCore({ dryRun: false });

    expect(result.failedDeletes).toBe(1);
    expect(mediaFindByIdAndUpdate).toHaveBeenCalledWith('a20', expect.objectContaining({
      $inc: { deleteRetryCount: 1 },
    }));
  });
});
