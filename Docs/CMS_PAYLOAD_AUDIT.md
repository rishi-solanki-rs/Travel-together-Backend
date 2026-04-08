# CMS_PAYLOAD_AUDIT

## Scope
- src/modules/cms
- src/modules/pages
- src/shared/models/CMSSection.model.js
- src/shared/models/Page.model.js
- related listing hydration paths in src/modules/listings and search

## Executive technical position
- CMS/page architecture is strong in concept.
- Current payload and query behavior has correctness and efficiency risks.
- Primary concerns: query condition overwrite bug, section-level fan-out, loose filter semantics, and non-standardized frontend payload contracts.

## 1) Homepage and CMS rendering pipeline forensic map

### Request path
- pages.routes.js -> GET /pages/render/:slug
- pages.controller.js -> pages.service.renderPage
- renderPage pulls page + section refs, applies visibility/schedule, then enriches each section via enrichSection

### Observed behavior
- section enrichment runs independent listing queries for each section.
- each listing query uses populate(cityId, subtypeId).
- response contains page meta + fully expanded sections.

## 2) Critical correctness issue in CMS query composition

### Evidence
- cms.service.js getSectionsByPage query object has two $or keys.
- In JavaScript object literals, duplicate keys are overwritten by the later key.

### Impact
- intended condition on page scope ($or: pageId or isGlobal) is overwritten by schedule $or.
- resulting query may return unexpected sections and miss scoped sections.
- frontend can render wrong blocks, especially on city/category pages.

### Risk level
- High

### Safe fix strategy
- rewrite query with explicit $and of scope and schedule expressions.
- add tests for scope x schedule matrix.

## 3) Frontend payload inefficiencies

### 3.1 Section payload bloat
- CMSSection includes desktopImages, mobileImages, listingIds, vendorIds, config map, content, CTA objects.
- all data may be serialized even when frontend only needs subset per section type.

### 3.2 Listing payload per section
- enrichSection selects a curated listing projection, which is positive.
- repeated for every section causes duplicate listing serialization across sections.

### 3.3 Optional fields and null density
- sections include many optional/null fields; no shape compaction by section type.

### 3.4 Mobile variant handling
- model has mobileImages, desktopImages.
- no explicit fallback contract in API response (for example mobile fallback to desktop order-matched item).

## 4) Query fan-out and repeated DB work

### N+1-ish pattern
- number of listing queries scales with number of active sections.
- for home page with 10 sections, up to 10 listing queries + populates.

### repeated filter overlap
- many sections can share same filters (city/category/isFeatured).
- no deduping of filter evaluation within request.

### cache behavior
- page render response cache exists per slug/city.
- cache is useful, but cold-start requests are expensive.

## 5) Section-type specific forensic notes

### hero_slider
- typically image-heavy.
- risk: no explicit maximum image counts in route validators.

### listing_carousel
- listing hydration depends on enrichSection listing query.
- risk: duplicate cards across multiple carousels without dedupe rules.

### city_banner
- city override relies on cityId in filter or request param.
- risk: ambiguity when both section filter city and request city exist.

### subtype_showcase
- enrichSection maps subtypeKey filter to subtypeId field directly.
- potential semantic mismatch if subtypeKey is not ObjectId.

### lucky_draw_widget
- widget content appears CMS-driven but lucky draw state validity is in lucky draw module.
- risk: stale campaign references in section content.

### cta_banner/deal_strip/text_block/map_embed
- content blocks are flexible.
- risk: no strict schema per section type in route layer.

## 6) Frontend consumption risks

### 6.1 Contract instability
- no generated typed schema from backend response.
- frontend likely must branch by section.type and handle sparse fields.

### 6.2 Overfetching
- page render returns full section objects where frontend may need compact card fields only.

### 6.3 Reconciliation complexity
- frontend merges CMS config with listing payload and media variants; brittle if optional fields drift.

## 7) Cache opportunities

### Existing
- pages.service caches rendered page key for 300 seconds.
- cms.service caches page sections for 300 seconds.

### Gaps
- missing deterministic cache key by section filter fingerprint.
- no two-tier cache strategy (raw sections cache + enriched section fragment cache).
- invalidation is manual and broad.

### Recommended
- fragment cache by sectionId + cityId + filter hash.
- dedupe listing queries by batching section filters where possible.

## 8) N+1 and population risk details

### Listing populate per section
- populate city and subtype for each listing query.
- repeated lookups for same city/subtype across sections.

### Mitigation
- prefetch city/subtype dictionaries for IDs seen in query result set.
- map in memory instead of repeated populate.

## 9) Response bloating forensic examples

### Example high-load page
- 12 sections
- 8 listing sections with limit 10 each
- 80 listing cards serialized
- each card includes stats/tags/cover/pricing/city/subtype
- payload likely >250KB depending image URL lengths and repeated keys

### Mobile impact
- high first render latency on moderate cellular networks.
- high JSON parse and hydration cost on client.

## 10) API contract upgrade proposal

### Define two payload modes
- compact: default for homepage and landing pages
- detailed: explicit query parameter for deep detail

### compact listing card schema
- id, slug, title
- coverImage mobile + card variant
- price display fields
- location label
- feature badge

### detailed listing payload
- include stats, tags, full pricing map, extended media references

## 11) City override forensic checks
- request cityId currently used to override section filters where applicable.
- no explicit precedence docs in API response.
- recommend return metadata:
- appliedCityId
- source: request|section|default

## 12) Subtype landing page forensic checks
- subtype-specific pages rely on section filters and page metadata.
- subtypeKey usage should be normalized to subtypeId lookup before query.

## 13) Hero/banner/cards/media specifics

### Hero banners
- ensure desktop/mobile arrays paired by order index.
- add fallback URLs generated server-side in response.

### Listing cards
- include deterministic badge and price labels from backend to reduce frontend branching.

### CTA sections
- validate URL safety and target values.

### Lucky draw widgets
- include campaign status and expiry countdown fields from backend to avoid extra calls.

## 14) Test matrix for CMS payload hardening
- page with no sections
- page with mixed global + local sections
- scheduled past/future/active sections
- city override present/absent
- sections with null mobileImages
- duplicate section filters across rows
- high section count cold cache

## 15) Performance budget recommendations
- home render P95: < 300 ms from cache, < 900 ms cold
- payload size target: < 120KB compressed for primary home render
- section listing query count target: <= 3 on cold render via batching

## 16) Risk register
- High: duplicate $or key bug in cms service scope/schedule query.
- High: section-level fan-out for listing hydration.
- Medium: subtypeKey to subtypeId mismatch risk.
- Medium: non-typed section contracts and sparse payload drift.
- Medium: broad invalidation strategy and cache miss storms.
- Low: route-level validator absence for some page/cms writes.

## 17) Safe remediation sequence
1. Fix cms query composition with explicit $and and tests.
2. Introduce compact payload mode and section-type serializers.
3. Batch listing hydration across sections.
4. Add section fragment cache.
5. Add strict validators for cms/page mutations.
6. Add response metadata for city override source and applied filters.

## 18) Frontend migration impact
- medium impact if compact mode becomes default.
- low impact if added as opt-in first.
- recommend phased rollout with feature flag and dual response mode.

## 19) QA plan
- golden-response snapshots for top pages.
- schema contract tests per section type.
- performance regression test with representative section counts.

## 20) Final verdict
- CMS and page system is close to production-grade architecture.
- two correctness issues and several payload/performance inefficiencies prevent enterprise readiness.
- with targeted refactor and contract hardening, this subsystem can scale safely.
