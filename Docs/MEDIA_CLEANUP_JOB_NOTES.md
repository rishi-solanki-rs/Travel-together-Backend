# MEDIA_CLEANUP_JOB_NOTES

## Scope
- src/jobs/mediaCleanupJob.js
- src/jobs/mediaOrphanReconciliationJob.js
- src/bootstrap/registerJobs.js

## New Jobs
1. mediaOrphanReconciliationJob
- Redis distributed lock key: cron:mediaOrphanReconciliationJob:lock
- Dry-run aware
- Scans references from:
  - listings
  - vendors
  - CMS sections
  - pages (ogImage extraction)
  - suite galleries (hotel room images)
- Marks orphan lifecycle state and cleanup eligibility windows.
- Emits duplicate checksum group report with reclaimable byte estimate.

2. mediaCleanupJob
- Redis distributed lock key: cron:mediaCleanupJob:lock
- Dry-run aware
- Targets eligible soft-deleted assets with lifecycle states:
  - pending_delete
  - delete_failed
  - orphaned
- Executes Cloudinary deletion with retry-safe backoff.
- On delete failure:
  - increments deleteRetryCount
  - re-queues via cleanupEligibleAt backoff
- Purges long-retained deleted records after grace threshold.

## Scheduling
Added in registerJobs:
- 02:30 Asia/Kolkata: orphan reconciliation
- 03:00 Asia/Kolkata: cleanup job

## Telemetry Counters
- scannedForDeleteCount
- deletedInCloudinary
- failedDeletes
- retryQueueDepth
- orphanCandidateCount
- staleUnusedAssetCount
- reclaimedBytes
- purgedDocuments
- duplicateGroupCount / duplicateAssetCount / reclaimableBytesEstimate
