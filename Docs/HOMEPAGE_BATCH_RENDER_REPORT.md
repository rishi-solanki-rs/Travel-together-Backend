# HOMEPAGE_BATCH_RENDER_REPORT

## Scope
- src/modules/pages/pages.service.js
- src/modules/pages/pages.controller.js
- tests/performance/pages.batch-render.test.js

## Objective Closed
- TD-008 (cold-render fan-out and duplicate hydration risk)

## Engine Upgrades
- Added feature-flagged batch engine:
  - `FF_PAGES_BATCH_ENRICH`
- Introduced render key strategy:
  - slug + city + payload mode
- Added section filter fingerprinting:
  - deterministic hash of filter/sort/limit/mode
- Added subtype normalization:
  - `subtypeKey -> subtypeId` via lookup
- Added shared listing hydration pool:
  - one query per unique filter fingerprint
- Added duplicate listing de-duplication:
  - id-based de-dupe before section serialization
- Added deterministic section serialization:
  - ordered media arrays
  - stable serializer surface for compact mode
- Added city override metadata per section:
  - `appliedCityId`
  - `source = request|section|default`
- Added compact/detailed listing card compatibility:
  - default remains detailed
  - compact is opt-in via query (`payloadMode` or `mode`)
- Added mobile-first image preference in listing serialization.

## Cold Cache and Fan-out Control
- Implemented distributed lock on render cache miss to reduce herd behavior.
- Added fragment cache for section-level listing payloads.
- On lock contention, renderer attempts fallback cache hit before recompute.

## Test Matrix Coverage
Covered in tests/performance/pages.batch-render.test.js:
1. 12-section cold render planning
2. duplicate section filters
3. mixed city override
4. compact mode payload behavior
5. detailed mode compatibility
6. subtype landing normalization
7. mobile image fallback
8. duplicate listing hydration de-duplication

## Compatibility
- Existing render route path unchanged (`/pages/render/:slug`).
- Existing response envelope remains compatible.
- Compact mode is opt-in; detailed behavior remains default.
