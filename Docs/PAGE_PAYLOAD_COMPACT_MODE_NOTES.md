# PAGE_PAYLOAD_COMPACT_MODE_NOTES

## Scope
- src/modules/pages/pages.service.js
- src/modules/pages/pages.controller.js

## Mode Model
- Default mode: `detailed` (backward-compatible default)
- Optional mode: `compact`
- Query options accepted on render route:
  - `payloadMode=compact`
  - `mode=compact`

## Compatibility Guarantees
- Route path unchanged.
- API envelope unchanged.
- Detailed mode remains default to preserve existing frontend behavior.

## Compact Mode Behavior
- Listing payload is reduced to card-centric fields:
  - id/slug/title
  - mobile-first image URL
  - feature badge booleans
  - city/subtype labels
  - lightweight price block
- Section serialization is deterministic and type-safe surface reduced to essential render data.

## Detailed Mode Behavior
- Existing richer listing fields are preserved for compatibility.
- Existing page and section structures are retained.

## Metadata Added
- Section-level city override metadata:
  - `appliedCityId`
  - `source`
- Render-level payload hints:
  - `estimatedPayloadBytes`
  - `compressionHint`
  - listing query counts and fragment-cache hit counts

## Rollout Recommendation
- Keep compact mode opt-in until frontend confirms parity.
- Promote to default only after payload and UX validation gates are complete.
