# CACHE_FRAGMENTATION_NOTES

## Scope
- src/config/redis.js
- src/modules/cms/cms.service.js
- src/modules/pages/pages.service.js

## Implemented Cache Hardening
- Replaced `KEYS` invalidation with SCAN-based traversal in `cache.delPattern`.
- Added `cache.invalidateBroad(prefixes)` for safe multi-surface invalidation.
- Added section fragment cache keys:
  - `sectionId + cityId + filterHash + payloadMode`
- Added rendered page cache keys:
  - `slug + city + payloadMode`
- Added cold-cache lock protection using distributed lock helper.

## Fragment Key Strategy
- Fragment key format:
  - `page:fragment:section:{sectionId}:city:{cityId|default}:hash:{filterHash}:mode:{payloadMode}`
- Benefits:
  - avoids duplicate listing hydration across identical section filters
  - keeps city and mode variants isolated

## Safe Broad Invalidation
Used on CMS/page mutation paths to avoid stale render surfaces:
- `cms:`
- `page:render:`
- `page:fragment:`

## Operational Notes
- SCAN invalidation avoids Redis blocking risk from KEYS on large keyspaces.
- lock-based cold-miss behavior reduces concurrent recomputation pressure.
- cache metadata now tracks hit/miss/fallback-hit for diagnostics.
