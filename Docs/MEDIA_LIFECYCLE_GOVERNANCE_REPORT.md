# MEDIA_LIFECYCLE_GOVERNANCE_REPORT

## Scope
- src/shared/models/MediaAsset.model.js
- src/modules/uploads/uploads.routes.js

## Objective
Upgrade media model and upload behavior to support lifecycle governance, orphan tracking, and dedupe-safe metadata without breaking response compatibility.

## MediaAsset Model Upgrades
Added governance fields:
- publicId: unique
- checksum
- lastAccessedAt
- orphanCandidate
- cleanupEligibleAt
- deleteRetryCount
- lifecycleStatus

Lifecycle statuses:
- active
- orphaned
- pending_delete
- delete_failed
- deleted
- duplicate

## Indexes Added
- publicId unique (field-level unique)
- checksum + vendorId + isDeleted (dedupe lookup)
- lifecycleStatus + cleanupEligibleAt + deleteRetryCount (cleanup scans)
- orphanCandidate + isDeleted + cleanupEligibleAt (orphan scan)

## Route-level lifecycle alignment
- Duplicate checksum hit reuses existing asset and refreshes access/lifecycle markers.
- Delete endpoint is retry-safe:
  - success -> lifecycleStatus=deleted
  - failure -> lifecycleStatus=delete_failed + retry increment
- My Assets fetch updates lastAccessedAt for telemetry and stale detection.

## Compatibility
- Upload route paths unchanged.
- Upload response envelope unchanged.
- MediaAsset core payload fields preserved.
- Validator middleware preserved.
