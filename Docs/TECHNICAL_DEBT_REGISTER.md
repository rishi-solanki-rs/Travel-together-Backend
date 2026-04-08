# TECHNICAL_DEBT_REGISTER

## Classification Model
- Severity: Critical, High, Medium, Low
- Type: Correctness, Security, Performance, Maintainability, Operability, Documentation
- Risk horizon: Immediate, Near-term, Mid-term

## Debt Register

### TD-001
- Title: Non-transactional slot assignment can oversubscribe inventory
- Severity: Critical
- Type: Correctness, Revenue
- Location: src/modules/slots/slots.service.js
- Symptom: check available -> create assignment -> decrement inventory sequence
- Risk horizon: Immediate
- Impact: revenue leakage, inventory drift, disputes
- Recommended action: transactional assignment with conditional inventory decrement

### TD-002
- Title: Subscription-state and slot-state invariants not enforced together
- Severity: High
- Type: Correctness
- Location: src/modules/subscriptions, src/modules/slots
- Symptom: slot assignment does not strictly gate on active/paid subscription
- Risk horizon: Immediate
- Impact: unpaid premium exposure
- Recommended action: strict assignment gate + lifecycle reconciliation

### TD-003
- Title: CMS query composition bug from duplicate key usage
- Severity: High
- Type: Correctness
- Location: src/modules/cms/cms.service.js
- Symptom: duplicate $or in object literal
- Risk horizon: Immediate
- Impact: wrong section retrieval
- Recommended action: rewrite query with explicit $and

### TD-004
- Title: Route-heavy modules bypass service layer
- Severity: High
- Type: Maintainability
- Location: search, uploads, inquiries, wishlist routes
- Symptom: DB operations and business rules embedded in routes
- Risk horizon: Near-term
- Impact: low testability and high regression risk
- Recommended action: extract controller/service layers

### TD-005
- Title: Sparse validator coverage across mutation endpoints
- Severity: High
- Type: Security, Correctness
- Location: most modules except auth and inline inquiry schema
- Symptom: missing zod/joi validation on many writes
- Risk horizon: Immediate
- Impact: malformed payload acceptance and inconsistent records
- Recommended action: module-specific validator files and route integration

### TD-006
- Title: Reset token persistence strategy is weak
- Severity: High
- Type: Security
- Location: auth repository/service + User model
- Symptom: direct token equality lookup flow
- Risk horizon: Immediate
- Impact: token abuse if DB compromised
- Recommended action: hash reset token and compare hash

### TD-007
- Title: Wishlist toggle race can skew counts
- Severity: High
- Type: Correctness
- Location: src/modules/wishlist/wishlist.routes.js
- Symptom: read-then-write toggle and separate stat update
- Risk horizon: Near-term
- Impact: counter drift and inconsistent UX
- Recommended action: atomic toggle strategy with transaction or idempotent operation

### TD-008
- Title: Page render section fan-out causes query amplification
- Severity: High
- Type: Performance
- Location: src/modules/pages/pages.service.js
- Symptom: per-section listing queries and populates
- Risk horizon: Near-term
- Impact: cold-cache latency and DB load spikes
- Recommended action: batching and fragment caching

### TD-009
- Title: Upload path uses in-memory base64 conversion
- Severity: High
- Type: Performance, Stability
- Location: src/modules/uploads/uploads.routes.js
- Symptom: memory amplification for multi-file upload
- Risk horizon: Immediate
- Impact: heap pressure and crash risk
- Recommended action: streaming cloudinary upload

### TD-010
- Title: Cron jobs have no distributed lock strategy
- Severity: High
- Type: Operability
- Location: src/bootstrap/registerCronJobs.js + jobs
- Symptom: multi-node duplicate execution risk
- Risk horizon: Near-term
- Impact: double processing and state churn
- Recommended action: lock keys with Redis NX/EX

### TD-011
- Title: Analytics event retention not bounded
- Severity: Medium
- Type: Performance
- Location: src/shared/models/AnalyticsEvent.model.js
- Symptom: no TTL index
- Risk horizon: Mid-term
- Impact: unbounded growth and slower analytics operations
- Recommended action: TTL retention policy and archival strategy

### TD-012
- Title: Analytics aggregator lacks idempotency marker
- Severity: Medium
- Type: Correctness
- Location: src/jobs/analyticsAggregatorJob.js
- Symptom: rerun can double-increment stats
- Risk horizon: Near-term
- Impact: inflated metrics
- Recommended action: per-day processed marker

### TD-013
- Title: Cache invalidation uses KEYS pattern
- Severity: Medium
- Type: Performance
- Location: src/config/redis.js
- Symptom: delPattern uses keys() then del()
- Risk horizon: Mid-term
- Impact: Redis blocking in larger keyspaces
- Recommended action: SCAN-based invalidation

### TD-014
- Title: Vendor currentPlan duplicates subscription truth
- Severity: Medium
- Type: Data consistency
- Location: Vendor model + subscriptions service
- Symptom: denormalized plan and activeSubscription pointer can diverge
- Risk horizon: Near-term
- Impact: ranking and entitlement mistakes
- Recommended action: invariant checks + reconciliation job

### TD-015
- Title: No strict scope validation in slot assignment
- Severity: Medium
- Type: Correctness
- Location: slots.service assignSlot
- Symptom: assignment does not fully verify listing matches inventory scope
- Risk horizon: Near-term
- Impact: wrong-slot placement
- Recommended action: enforce city/category/subtype/listing ownership checks

### TD-016
- Title: Lucky draw randomness not audit-grade
- Severity: Medium
- Type: Fairness, Compliance
- Location: luckyDraw service and job
- Symptom: Math.random sort-based shuffle
- Risk horizon: Mid-term
- Impact: fairness challenge risk
- Recommended action: cryptographic RNG + deterministic audit log

### TD-017
- Title: Upload module lacks strict role/context validation
- Severity: Medium
- Type: Correctness
- Location: uploads.routes.js
- Symptom: role/context accepted with fallback and minimal checks
- Risk horizon: Near-term
- Impact: inconsistent media classification
- Recommended action: zod schema and enum-bound constraints

### TD-018
- Title: Postman generation and documentation drift
- Severity: Medium
- Type: Documentation, DX
- Location: generatePostman.js, POSTMAN_USAGE_GUIDE.md
- Symptom: generated collection is minimal vs guide describing full suite
- Risk horizon: Near-term
- Impact: testing confusion and stale QA flows
- Recommended action: generate from swagger or source routes

### TD-019
- Title: Swagger lacks cookie auth and standard error schema
- Severity: Medium
- Type: Documentation, Integration
- Location: src/config/swagger.js
- Symptom: bearer only scheme
- Risk horizon: Near-term
- Impact: integration friction
- Recommended action: add cookie auth and reusable error components

### TD-020
- Title: Template rules not enforced in listing writes
- Severity: Medium
- Type: Correctness
- Location: templates + listings modules
- Symptom: dynamicFields accepted without template-driven validator bridge
- Risk horizon: Mid-term
- Impact: inconsistent listing quality
- Recommended action: generate runtime validators from template schema

### TD-021
- Title: Notification side effects are synchronous in hot paths
- Severity: Medium
- Type: Operability
- Location: inquiries, jobs, luckyDraw flows
- Symptom: email/notification in request path
- Risk horizon: Near-term
- Impact: latency and partial-failure coupling
- Recommended action: queue with retries and dead-letter handling

### TD-022
- Title: Inconsistent module export style and formatting hygiene
- Severity: Low
- Type: Maintainability
- Location: multiple modules
- Symptom: mixed named/default patterns and minor style drift
- Risk horizon: Mid-term
- Impact: developer friction
- Recommended action: standard export convention + lint rules

### TD-023
- Title: SEO route naming typo
- Severity: Low
- Type: Maintainability
- Location: src/modules/seo/seo.routes.js
- Symptom: getBySlugor
- Risk horizon: Mid-term
- Impact: minor readability debt
- Recommended action: rename and keep alias for compatibility if needed

### TD-024
- Title: Missing explicit tests around concurrency critical paths
- Severity: High
- Type: Quality
- Location: repository-wide
- Symptom: no visible targeted race/concurrency test scaffolding
- Risk horizon: Immediate
- Impact: regressions escape to production
- Recommended action: add concurrency test suite for slots/wishlist/uploads

## Debt Clusters

### Cluster A: Revenue-critical correctness debt
- TD-001, TD-002, TD-015

### Cluster B: Payload/performance debt
- TD-008, TD-009, TD-013

### Cluster C: Security/validation debt
- TD-005, TD-006, TD-017

### Cluster D: Observability/docs debt
- TD-018, TD-019, TD-021

## Remediation Priority Queue
1. TD-001
2. TD-002
3. TD-005
4. TD-006
5. TD-004
6. TD-008
7. TD-009
8. TD-024
9. TD-003
10. TD-013

## Closure Criteria Template
- defined owner
- scoped ADR
- feature flag strategy
- unit + integration tests
- production observability checks
- rollback plan
- signoff by backend + frontend + QA
