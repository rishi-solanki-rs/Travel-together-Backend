# CLOUDINARY_MEDIA_AUDIT

## Scope
- src/config/cloudinary.js
- src/utils/cloudinaryHelper.js
- src/modules/uploads/uploads.routes.js
- src/shared/models/MediaAsset.model.js
- media references in ListingBase, Vendor, CMSSection

## 1) Media architecture forensic overview
- Cloudinary v2 configured centrally.
- helper encapsulates upload/delete and variant URL generation.
- module stores MediaAsset with metadata and variant URLs.
- listing/vendor/cms models also hold embedded image structures.

## 2) Upload middleware forensic

### Current pipeline
- multer memory storage
- file type check via mimetype startsWith image/
- per-file size limit 10MB
- route constructs base64 data URI
- helper uploads to cloudinary
- metadata persisted in MediaAsset

### Risks
- High: base64 conversion increases memory usage and CPU overhead.
- High: memory storage for multi-file upload can stress node heap.
- Medium: mimetype-only validation can be bypassed by crafted payloads.
- Medium: no explicit image dimension policy.

## 3) Transformation and variants forensic

### Strengths
- helper defines desktop/mobile/card/thumbnail/seo variants.
- variant generation is deterministic and centralized.

### Gaps
- no explicit contract indicating which variant each frontend surface should consume.
- no format/quality override by context (for example product vs hero).
- no signed URL policy for sensitive assets if needed in future.

## 4) Thumbnail and mobile variant behavior

### Current
- mobile variant fixed at 768x432 fill.
- thumbnail 150x150 thumb gravity auto.

### Considerations
- for portrait-first content, fill may crop key visual details.
- card and mobile may need context-specific gravity preferences.

## 5) Alt text support forensic

### Existing
- altText is stored on MediaAsset and embedded image objects across models.

### Gaps
- no validation or minimum quality check for altText presence on key images.
- no fallback generation strategy for missing alt text.

## 6) Cleanup logic forensic

### Existing
- delete endpoint removes cloudinary publicId then soft-deletes MediaAsset.

### Gaps
- no periodic purge for long-term isDeleted assets.
- no retry queue when cloudinary delete fails.
- no orphan reconciliation for assets detached from listings/vendors.

## 7) Stale image risk analysis

### Stale scenarios
- listing soft-deleted but media remains active.
- vendor profile images replaced and old assets remain in cloudinary.
- cms image updates without old asset cleanup.

### Impact
- cloudinary storage cost drift.
- stale content URLs in clients/CDN caches.

## 8) Duplicate asset risk analysis

### Current state
- no dedupe hash stored in MediaAsset.
- same file can be uploaded repeatedly and billed repeatedly.

### Recommendation
- add content hash metadata at upload time.
- optional dedupe mode by vendor/listing scope.

## 9) Public payload shape forensic

### Existing payloads
- listing and vendor include embedded image objects.
- uploads module returns MediaAsset records.
- pages/cms can include arrays of desktop/mobile images.

### Gaps
- payload shape not normalized globally.
- frontend may branch per module to resolve url/altText/variant fields.

## 10) Security and abuse posture
- upload limiter exists.
- no malware scanning stage.
- no strict extension whitelist beyond image mimetype.
- no EXIF stripping policy discussed.

## 11) Operational excellence findings
- Medium: no upload observability metrics by context/role.
- Medium: no failed-delete dead-letter queue.
- Low: no explicit correlation id persisted on media operations.

## 12) Model-level forensics

### MediaAsset model strengths
- references to vendor/listing/uploader
- variant map and dimensions
- role/type enums and indexes

### Model gaps
- no unique index on publicId.
- no checksum/hash field for dedupe.
- no lastAccessedAt for lifecycle management.

## 13) Cloudinary helper forensic notes
- helper catches and wraps errors with ApiError.internal.
- deleteMultiple exists but not integrated in cleanup workflows.
- variant generation uses cloudinary.url with transform config, good.

## 14) Cost-risk estimate (qualitative)
- without cleanup and dedupe, storage growth is monotonic and unbounded.
- cost risk increases with suite rollout and high-volume gallery uploads.

## 15) Priority hardening recommendations
1. Replace base64 path with stream upload to cloudinary uploader stream.
2. Add zod validator for upload context/role/altText/order/listingId.
3. Add image dimension checks and optional compression pre-upload.
4. Add MediaAsset unique index on publicId.
5. Add daily/weekly cleanup job for stale isDeleted assets.
6. Add orphan scanner for detached assets.
7. Add content hash dedupe option.
8. Add frontend variant contract documentation.

## 16) Safe rollout plan

Phase 1
- add validators and publicId uniqueness.
- add upload telemetry.

Phase 2
- introduce streaming upload under feature flag.
- monitor memory and latency.

Phase 3
- run cleanup/orphan jobs in dry-run mode.
- verify delete candidate count and false positives.

Phase 4
- enforce cleanup and dedupe policies.

## 17) QA and regression plan
- single and multi-file uploads under concurrency.
- invalid mimetype and oversized images.
- delete failures and retry behavior.
- stale asset cleanup dry-run vs live run.
- variant correctness checks in frontend pages.

## 18) Final verdict
- Cloudinary integration is functionally complete for core upload use.
- enterprise-grade media lifecycle governance is partial.
- memory safety, cleanup, and dedupe are highest priority gaps.
