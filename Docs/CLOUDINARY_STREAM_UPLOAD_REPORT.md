# CLOUDINARY_STREAM_UPLOAD_REPORT

## Scope
- src/modules/uploads/uploads.routes.js
- src/utils/cloudinaryHelper.js
- src/config/env.js

## Objective
Implement stream-first upload path with memory-safety and compatibility guarantees while preserving upload API routes and payload shape.

## Implemented
1. Feature flag
- Added FF_UPLOAD_STREAM_MODE in env config.
- Stream mode is enabled by default and can be disabled for rollback.

2. Streaming engine
- Upload path switched to disk-backed multipart ingestion and Cloudinary upload_stream.
- Route endpoints remain unchanged:
  - POST /uploads/single
  - POST /uploads/multiple

3. Multi-file concurrency safety
- Added bounded worker pool (limit=5) for /multiple uploads.
- Supports up to 20 uploaded files per request while limiting stream pressure.

4. Memory telemetry
- Captures process memory before/after upload batches and stores metrics under MediaAsset metadata.

5. Mimetype + extension whitelist
- Enforced for jpeg/png/webp/gif/avif by route fileFilter and helper validation.

6. Image dimension validation
- Enforced min/max limits through helper validation.
- Invalid dimensions produce unprocessable response.

7. EXIF stripping + compression hook
- Cloudinary options now support strip_profile and quality/fetch_format auto transformations.
- Compression hook entrypoint added in helper option pipeline.

8. Context transformation presets
- Added context-aware eager transform presets for supported upload contexts.

9. Compatibility preserved
- Existing MediaAsset payload keys remain intact:
  - publicId
  - url
  - format
  - width/height
  - bytes
  - variants
- Existing variant keys preserved:
  - desktop/mobile/card/thumbnail/seo

10. Mobile-first optimization
- Mobile transform tuned with quality auto:eco + dpr auto + fetch_format auto.

11. Retry-safe stream handling
- Stream upload retries with exponential backoff for transient failures.
- Temp-file cleanup is best-effort and resilient.
