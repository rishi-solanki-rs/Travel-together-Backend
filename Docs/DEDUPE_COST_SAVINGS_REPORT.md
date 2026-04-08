# DEDUPE_COST_SAVINGS_REPORT

## Scope
- src/modules/uploads/uploads.routes.js
- src/jobs/mediaOrphanReconciliationJob.js
- src/jobs/mediaCleanupJob.js

## Dedupe Controls Implemented
1. Checksum-based dedupe
- SHA-256 checksum computed from uploaded file stream.
- Existing asset lookup on checksum before Cloudinary upload.

2. Optional vendor-scoped dedupe
- dedupeScope=vendor (default): checksum match constrained to vendorId.
- fallback global dedupe path available when scope is not vendor.

3. Duplicate upload reuse response
- On checksum match, existing MediaAsset is returned without re-upload.
- Prevents duplicate Cloudinary storage and transformation billing.

4. Duplicate reconciliation diagnostics
- Orphan reconciliation job aggregates duplicate checksum groups.
- Reports duplicate asset count and reclaimable byte estimate.

## Cost Governance Outcomes
- Reduced duplicate image billing risk via pre-upload checksum lookup.
- Reduced stale/orphan storage growth through scheduled reconciliation + cleanup.
- Added reclaimable bytes metrics for Cloudinary savings visibility.

## Storage Growth Diagnostics
- staleUnusedAssetCount
- orphanCandidateCount
- retryQueueDepth
- reclaimedBytes
- duplicateGroupCount
- duplicateAssetCount

## Operational Recommendation
- Keep FF_UPLOAD_STREAM_MODE enabled in production.
- Keep MEDIA_CLEANUP_DRY_RUN=true during initial rollout window, then switch to false after telemetry validation.
