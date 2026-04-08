# SAFE_REFACTOR_EXECUTION_PLAN

## Objective
Provide an implementation-grade, low-risk execution roadmap to remediate critical backend issues while preserving service continuity and frontend compatibility.

## Planning Principles
- No blind rewrites.
- Feature-flag major behavior shifts.
- Prefer additive migrations before destructive changes.
- Sequence by risk containment first, then structural improvements.
- Every change includes testing, observability, and rollback.

## Workstreams
- WS1: Revenue-critical correctness
- WS2: Security and validation hardening
- WS3: CMS/payload performance
- WS4: Media pipeline safety
- WS5: Docs/testing and operational readiness

## Phase 0: Readiness (2-3 days)

### Deliverables
- establish branch strategy and release trains
- define feature flags
- baseline dashboards and alerts
- freeze high-risk schema churn

### Feature flags to create
- FF_SLOT_TX_ASSIGN
- FF_TEMPLATE_RUNTIME_VALIDATION
- FF_PAGES_BATCH_ENRICH
- FF_UPLOAD_STREAM_MODE
- FF_NOTIF_QUEUE_MODE

### Risk controls
- canary deployment lane
- one-click rollback per flag

---

## Phase 1: Critical Correctness Containment (Week 1)

### Item 1: Transactional slot assignment
- Scope: src/modules/slots/slots.service.js
- Change:
- conditional inventory decrement in transaction
- only create assignment when decrement succeeds
- enforce subscription + listing scope checks
- Risk level: Critical
- Migration complexity: Medium
- Frontend impact: Low
- Testing scope:
- unit tests for happy/fail paths
- concurrency test with parallel assign calls
- observability check for availableSlots negative count
- Rollout:
- deploy behind FF_SLOT_TX_ASSIGN false
- canary 10%
- full enable after 24h clean metrics

### Item 2: Subscription-slot invariant enforcement
- Scope: slots + subscriptions services
- Change:
- strict gate on subscription status ACTIVE and paymentStatus paid
- block assignment when invalid
- Risk level: High
- Migration complexity: Low-Medium
- Frontend impact: Medium (error messages)
- Testing scope: integration tests for unpaid/expired/cancelled scenarios
- Rollout: with FF_SLOT_TX_ASSIGN

### Item 3: CMS scope/schedule query fix
- Scope: src/modules/cms/cms.service.js
- Change:
- replace duplicate-key query with explicit logical composition
- Risk level: High
- Migration complexity: Low
- Frontend impact: Medium (rendered sections may change to correct set)
- Testing scope:
- snapshot tests for page composition
- schedule matrix tests
- Rollout:
- no flag required if tests robust
- optional fast rollback by revert

---

## Phase 2: Security + Validation Hardening (Week 2)

### Item 4: Reset token hashing migration
- Scope: auth repository/service + User model
- Change:
- store hashed reset tokens
- lookup via token hash compare
- one-time consumption guarantees
- Risk level: High
- Migration complexity: Medium
- Frontend impact: Low
- Testing scope:
- reset flow e2e
- invalid token behavior
- replay attempt rejection
- Rollout:
- dual-read strategy for short migration window

### Item 5: Validator expansion across mutation endpoints
- Scope: modules without validators
- Change:
- add validator files per module
- enforce validateBody on writes
- Risk level: High
- Migration complexity: Medium-High
- Frontend impact: Medium (stricter payload acceptance)
- Testing scope:
- schema contract tests
- negative payload tests
- Rollout:
- progressive module-by-module enablement
- return actionable error messages for frontend

### Item 6: Wishlist atomicity fix
- Scope: src/modules/wishlist/wishlist.routes.js (plus extracted service)
- Change:
- atomic toggle or idempotent add/remove endpoints
- counter floor guard
- Risk level: High
- Migration complexity: Medium
- Frontend impact: Low-Medium
- Testing scope: concurrent toggle tests

---

## Phase 3: Payload and Performance Refactor (Week 3)

### Item 7: Batch section enrichment in page render
- Scope: src/modules/pages/pages.service.js
- Change:
- batch listing hydration across sections
- optional fragment caching
- compact response mode
- Risk level: High
- Migration complexity: Medium
- Frontend impact: Medium
- Testing scope:
- response equivalence tests
- P95 latency tests
- Rollout:
- FF_PAGES_BATCH_ENRICH enabled for selected pages first

### Item 8: Redis invalidation hardening
- Scope: src/config/redis.js
- Change:
- replace KEYS with SCAN pattern deletion utility
- Risk level: Medium
- Migration complexity: Low
- Frontend impact: None
- Testing scope: cache invalidation integration tests

### Item 9: Analytics retention + idempotency
- Scope: AnalyticsEvent model + aggregator job
- Change:
- add TTL index policy
- add idempotency marker for aggregation day
- Risk level: Medium
- Migration complexity: Medium
- Frontend impact: Low
- Testing scope: rerun safety and retention behavior tests

---

## Phase 4: Media Pipeline Hardening (Week 4)

### Item 10: Stream upload mode
- Scope: uploads routes + cloudinary helper
- Change:
- shift from base64 memory path to stream upload
- add image dimension and role/context validators
- Risk level: High
- Migration complexity: Medium
- Frontend impact: Low
- Testing scope:
- throughput and memory profiling
- multi-file upload stress tests
- Rollout:
- FF_UPLOAD_STREAM_MODE canary then global

### Item 11: Stale/orphan cleanup jobs
- Scope: new media cleanup job + safe dry-run mode
- Change:
- orphan detection
- grace-period deletion
- audit logs for deleted assets
- Risk level: Medium
- Migration complexity: Medium
- Frontend impact: Low (if grace-period respected)
- Testing scope: dry-run verification and spot checks

---

## Phase 5: Architecture Cleanup (Week 5)

### Item 12: Route-heavy module extraction
- Scope: search, uploads, inquiries, wishlist
- Change:
- extract service/controller layers
- unify error and telemetry behavior
- Risk level: Medium
- Migration complexity: Medium
- Frontend impact: None
- Testing scope: endpoint parity tests

### Item 13: Template runtime validation bridge
- Scope: listings + templates
- Change:
- build runtime validator from ListingTemplate definitions
- enforce on listing create/update/publish
- Risk level: Medium
- Migration complexity: High
- Frontend impact: Medium
- Testing scope: schema compatibility tests per subtype

---

## Phase 6: Docs, QA, and DevOps Alignment (Week 6)

### Item 14: Swagger and Postman alignment
- Scope: src/config/swagger.js + generation scripts
- Change:
- add cookie auth scheme
- add standard error schema
- generate postman collection from source of truth
- Risk level: Medium
- Migration complexity: Medium
- Frontend impact: Positive
- Testing scope: docs-contract CI checks

### Item 15: Test suite upgrades
- Scope: repository-wide
- Change:
- add concurrency tests
- add golden payload snapshots for pages/CMS
- add cron job integration tests with lock mocks
- Risk level: High if not done
- Migration complexity: Medium
- Frontend impact: None

---

## Migration and Data Safety Details

### Schema migration strategy
- additive fields first
- backfill with idempotent scripts
- verify read-path compatibility
- remove deprecated fields after two release cycles

### Rollback policy
- each phase deployable independently
- feature flags disable new behavior fast
- DB migrations include down/compensating scripts when feasible

### Observability requirements per release
- dashboards for slots, subscriptions, cms render latency, upload memory, cron status
- alert thresholds pre-defined before enabling flags

## Frontend Impact Matrix
- Slot assignment hardening: low, mostly error code behavior
- Validator expansion: medium, may require payload fixes in forms
- CMS batching/compact mode: medium, contract adaptation required
- Upload stream mode: low, endpoint semantics unchanged
- Template validation bridge: medium-high for vendor form clients

## Testing Scope Matrix
- Unit tests: all changed services
- Integration tests: route + DB correctness
- Concurrency tests: slots, wishlist, uploads
- Contract tests: page render and CMS sections
- Performance tests: home render, search, uploads
- Soak tests: cron jobs and cache churn

## Release Order Summary
1. Slot transaction + invariant checks
2. CMS query bug fix
3. Reset token hardening
4. Validator expansion wave
5. Wishlist atomicity
6. Pages batching and cache improvements
7. Analytics TTL/idempotency
8. Upload streaming + cleanup
9. Route extraction and template runtime enforcement
10. Swagger/Postman contract alignment + test gates

## Governance and Ownership
- Backend lead: WS1, WS2
- Platform/devops: WS3 cache + cron lock infra
- Media team: WS4
- QA lead: cross-phase test plans and release signoff
- Frontend lead: payload contract adoption and validation-error UX handling

## Exit Criteria
- zero critical findings open from this audit
- zero known negative inventory occurrences over 14 days
- no CMS render mismatch regressions in golden snapshots
- upload memory profile stable under stress threshold
- API docs and postman synchronized with deployed routes
