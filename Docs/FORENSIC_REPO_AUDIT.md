# FORENSIC_REPO_AUDIT

## Audit Mode
- Audit profile: Principal backend forensic audit
- Depth: Multi-pass repository-wide
- Scope: src/bootstrap, src/config, src/jobs, src/middlewares, src/modules, src/shared/models, src/utils, root docs and API artifacts
- Evidence source: Static source scan with cross-reference against BACKEND_IMPLEMENTATION_GUIDE.md and MODULE_FLOW_DOCUMENTATION.md
- Date: 2026-04-06

## 1) Repository Structure Forensics

### 1.1 Folder intent and boundary health
- src/bootstrap: central app registration for routes, cron, swagger. Boundary is clean and appropriately thin.
- src/config: environment, db, cors, redis, cloudinary, limiter, swagger. Boundary is mostly correct.
- src/jobs: background automation tasks. Correct placement but no distributed lock guard in high-impact jobs.
- src/middlewares: auth, authorize, validate, error handling. Good shared boundary.
- src/modules: domain separation is present and generally consistent.
- src/shared/models: all primary schema definitions are centralized; this is healthy for consistency.
- src/utils: response envelope, token helper, cloudinary helper, logger, pagination, slug.

### 1.2 Boundary violations and coupling
- Route-heavy modules violate service/controller separation:
- src/modules/search/search.routes.js
- src/modules/uploads/uploads.routes.js
- src/modules/inquiries/inquiries.routes.js
- src/modules/wishlist/wishlist.routes.js
- These files contain business logic, DB calls, and response formatting in route layer.
- Effect: testability drops, reuse drops, and behavior drift increases.

### 1.3 Dead/minimal module risk
- modules with thin surface and no service layer:
- search, uploads, inquiries, wishlist
- modules with basic route coverage but no explicit write validation contracts:
- hotels, thingsToDo, restaurants, shops, tribes, kidsWorld, destinations, slots, pages, cms
- reports/seo/notifications/monetization have route-level implementation but little layering.

### 1.4 Architecture scorecard (0-10)
- Folder architecture quality: 8.2
- Domain modularity: 7.4
- Layering consistency: 5.6
- Transactional safety: 4.3
- Payload discipline: 6.1
- Validation discipline: 4.8
- Runtime safety under concurrency: 4.2
- Observability and auditability: 5.0
- Documentation fidelity vs implementation: 6.0
- Overall production hardening score: 5.7

### 1.5 Scalability risks
- Redis key deletion uses KEYS pattern in src/config/redis.js via delPattern. This blocks with larger keyspaces.
- Page rendering fan-out in src/modules/pages/pages.service.js runs section-level listing queries in parallel for each section.
- Slot assignment in src/modules/slots/slots.service.js is non-transactional and vulnerable to oversubscription under contention.
- Media upload uses in-memory + base64 conversion, increasing RAM pressure for multi-file uploads.

## 2) Shared Core Forensics (Cross-cutting)

### 2.1 Auth and token lifecycle
- auth service: src/modules/auth/auth.service.js
- repository: src/modules/auth/auth.repository.js
- tokens: src/utils/tokenHelper.js

Findings:
- Refresh token stored as a single value per user, compared by exact equality. No token family/versioning.
- Refresh rotation exists but no replay-detection lineage.
- forgotPassword creates reset token and stores plain token via repository setResetToken.
- resetPassword verifies JWT token and then queries user by DB token equality.
- Practical risk: DB exfiltration exposes active reset tokens.
- verifyEmail now correctly clears OTP through authRepo.verifyEmail path.
- login failure lock mechanism exists but lock reset and counter update are separate operations.

### 2.2 RBAC and authorization
- middleware: src/middlewares/authorize.js

Findings:
- authorize/hasPermission patterns are coherent.
- hasPermission trusts permissions embedded in JWT payload.
- if permission set changes in DB, existing token remains stale until refresh/login.
- isOwnVendor compares req.user.vendorId and supplied vendorId as strict inequality without ObjectId normalization.

### 2.3 Users and vendors
- users service: src/modules/users/users.service.js
- vendor service: src/modules/vendors/vendors.service.js
- models: src/shared/models/User.model.js, src/shared/models/Vendor.model.js

Findings:
- user soft-delete flow exists and is simple.
- createVendor mutates user role to vendorAdmin directly; no workflow state machine.
- vendor ownership/staff capability exists in schema, but staff assignment operational flow is not evident.
- vendor plan state is duplicated conceptually between vendor.currentPlan and vendor.activeSubscriptionId.

### 2.4 Core taxonomy: categories, subtypes, templates
- models: Category.model.js, SubType.model.js, ListingTemplate.model.js
- template service: src/modules/templates/templates.service.js

Findings:
- schema quality is strong for field-definition flexibility.
- runtime enforcement of template fields against listing dynamicFields is not visible in listings service.
- subtype.filters and cardConfig are defined, but not deeply integrated in search endpoint.

### 2.5 CMS/pages payload path
- cms service: src/modules/cms/cms.service.js
- pages service: src/modules/pages/pages.service.js
- models: CMSSection.model.js, Page.model.js

Findings:
- good scheduling abstraction exists.
- duplicated $or key in getSectionsByPage causes first $or to be overwritten by second $or in JS object literal.
- page render performs per-section listing query in enrichSection; higher latency at scale.
- cache key is good, but invalidation is partial and not systematically tied to all content dependencies.

### 2.6 Media and uploads
- routes: src/modules/uploads/uploads.routes.js
- helper: src/utils/cloudinaryHelper.js
- model: MediaAsset.model.js

Findings:
- role, altText, order are accepted from request with minimal constraints.
- conversions use data URI base64; memory amplification risk.
- delete flow marks DB asset deleted after cloudinary delete call; no durable retry queue.
- variant generation is helper-based and consistent.

### 2.7 Audit logs and notifications
- AuditLog model exists: src/shared/models/AuditLog.model.js
- notifications route: src/modules/notifications/notifications.routes.js

Findings:
- audit middleware file exists in structure but functional evidence of full write-audit coverage is not found in route registration.
- notification flow is synchronous in many write paths; no queue or dead-letter handling.

### 2.8 SEO and analytics
- seo route: src/modules/seo/seo.routes.js
- analytics service/controller: src/modules/analytics
- event model: AnalyticsEvent.model.js
- job: analyticsAggregatorJob.js

Findings:
- analytics model has useful indexes but no TTL retention strategy.
- aggregator increments listing stats daily but does not include idempotency marker per day.
- seo route function naming typo getBySlugor indicates maintainability debt.

### 2.9 Inquiries and wishlist
- route-implemented modules, no dedicated service files.

Findings:
- inquiries uses inline zod schema and reasonable flow.
- wishlist toggle can race under concurrent calls due read-then-write pattern.
- wishlist stat decrement can go below zero in pathological concurrent remove paths without guard.

## 3) API Surface and Frontend-Payload Awareness

### 3.1 Payload size concerns
- getListingBySlug populates vendor/category/subtype/city and returns rich listing document.
- search endpoint returns selected fields but includes tags and stats for every card.
- pages.render merges section metadata + listing arrays potentially large when section limits are high.

### 3.2 Mobile payload and image variants
- media variants desktop/mobile/card/thumbnail/seo are generated by helper.
- payload contracts for choosing mobile variant are not enforced at route level.
- CMS section has desktopImages and mobileImages arrays, but no explicit fallback policy encoded in API response shape.

### 3.3 N+1 and repeated queries
- pages.render -> enrichSection runs per section ListingBase query.
- inquiries.submit reads listing twice in some branches (one for increment, one for title extraction).
- route-level inline logic makes query reuse harder.

## 4) Slot Monetization Forensics (Repository-level view)

### 4.1 Inventory and assignment correctness
- assignment uses read inventory, then create assignment, then decrement inventory.
- no transaction means oversubscription under parallel requests.
- subscription validity and payment state are not strongly enforced inside assignSlot.

### 4.2 Expiry and synchronization
- slotExpiryJob iterates expired assignments and updates assignment, inventory, listing flags sequentially.
- no lock per assignment or inventory shard.
- on multi-instance deployment, duplicate processing risk exists.

### 4.3 Ranking and tie behavior
- featured query sorts by static priority descending.
- no deterministic tie-breaker beyond DB default if equal priority.
- no decay strategy for old assignments.

## 5) Cloudinary Media Forensics (Repository-level view)

### 5.1 Strengths
- central transformation presets.
- folder map by context.
- helper abstraction is clean and reusable.

### 5.2 Risks
- memory amplification via base64 conversion.
- no periodic cleanup for stale isDeleted assets.
- no dedupe by file hash or content identity.

## 6) Postman + Swagger Forensics

### 6.1 Swagger
- security scheme contains bearer only.
- refresh token cookie behavior not represented in security schemes.
- no shared error schema components documented.

### 6.2 Postman artifacts
- generatePostman.js outputs small collection with limited route coverage.
- POSTMAN_USAGE_GUIDE.md describes broader collection architecture than generation script produces.
- naming mismatch among collection files mentioned in docs vs generated file name.

## 7) Spec Comparison Snapshot

### 7.1 Matching areas
- modular monolith architecture is implemented.
- core categories and suites exist.
- cron jobs exist for campaign, slot expiry, subscriptions, analytics, lucky draw.

### 7.2 Divergence areas
- docs imply broad validator discipline; implementation has one standalone validator module plus one inline schema in inquiries.
- docs imply comprehensive postman suite; generator currently emits minimal set.
- docs imply robust monetization flow; transactional guarantees are incomplete.

## 8) Enterprise Risk Register (Top 20)
- Critical: slot oversubscription race in src/modules/slots/slots.service.js
- Critical: reset token stored in queryable plain token form via auth repository path
- High: duplicated key bug in cms getSectionsByPage query object
- High: wishlist toggle race and stat skew in src/modules/wishlist/wishlist.routes.js
- High: non-idempotent daily analytics aggregation if rerun inadvertently
- High: media upload memory amplification due data URI conversion
- High: stale JWT permission propagation in hasPermission model
- High: no distributed lock around cron jobs in multi-instance runtime
- Medium: cache delPattern uses KEYS and can block under larger data volume
- Medium: route-level business logic in four modules reduces maintainability
- Medium: vendor plan/subscription state dual-source without invariant enforcement
- Medium: missing validators across most write endpoints
- Medium: inconsistent docs-route naming around verify OTP/email
- Medium: no explicit payload contracts for mobile image fallback
- Medium: no retention policy on analytics events
- Medium: no queueing for notification side effects
- Medium: weak deterministic sorting ties in featured slot listing
- Low: naming typo getBySlugor in SEO route
- Low: unused imports in some modules indicate hygiene drift
- Low: test coverage posture not evident from route complexity

## 9) Modularity and Scalability Verdict
- Architectural intent is strong and coherent.
- Implementation maturity is uneven.
- Main blockers for enterprise-grade confidence are transactional guarantees, validator coverage, and consistency between docs and executable artifacts.

Final verdict:
- Maintainability: Medium
- Correctness under normal load: Medium
- Correctness under concurrent load: Low-Medium
- Revenue-critical resilience: Low-Medium
- Scale-readiness for multi-node: Medium after targeted hardening

## 10) Immediate No-Regret Actions
- Add transaction-backed assignSlot with conditional inventory decrement.
- Add central write-validator schemas for all mutation routes.
- Refactor route-heavy modules into controller/service layers.
- Introduce cron distributed lock strategy.
- Add analytics retention and aggregator idempotency key.
- Replace delPattern KEYS with SCAN-based invalidation strategy.
- Add reset token hashing strategy and one-time consumption guarantees.
- Add postman generation from actual route/validator contracts.

## 11) Audit Confidence
- Confidence level: High for structural and code-path findings.
- Confidence level: Medium for runtime behavior requiring traffic simulation.
- Suggested verification method: load + concurrency tests for slots, wishlist, page rendering, and upload pipeline.
