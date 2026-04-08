# DB_SPEC_DIFF_REPORT

## Scope and Comparison Inputs

### Requested comparison set
- db-spec docs
- model explanation docs
- slot booking specs
- extracted spec notes
- FRD
- vendor suite architecture

### Artifacts actually found in workspace
- BACKEND_IMPLEMENTATION_GUIDE.md
- MODULE_FLOW_DOCUMENTATION.md
- ARCHITECTURE_GAP_ANALYSIS.md
- CURRENT_BACKEND_AUDIT.md
- SAFE_REFACTOR_PLAN.md
- executable schemas and modules under src/shared/models and src/modules

### Constraint note
- Explicit FRD/db-spec files were not found as standalone artifacts in this workspace scan.
- This report compares available specification docs against executable code and schema behavior.

## Method
- compared doc claims to model fields/enums/indexes and service/route behavior.
- tagged each mismatch as:
- Missing in code
- Extra in code
- Enum drift
- Reference drift
- Normalization drift
- Behavior drift

---

## 1) Global Schema Coverage Comparison

### 1.1 Areas where code aligns with docs
- modular domain structure with suites for hotels, tours, restaurants, shops, tribes, kids world, destinations.
- shared ListingBase core with suite extension models exists.
- monetization primitives (plans, subscriptions, slot inventory/assignment) exist.
- CMS/page composition model exists.

### 1.2 Major divergence themes
- dynamic template enforcement is partial.
- slot assignment transactional safety is missing.
- validator coverage is much narrower than enterprise guide narrative suggests.
- postman generation does not mirror claimed comprehensive route set.

---

## 2) Field-Level and Enum-Level Diffs

## 2.1 Auth and user security fields

### Doc expectation
- secure password reset and verification flows.

### Code status
- User model includes passwordResetToken and expiry fields.
- reset flow uses token equality query in repository path.

### Diff
- Behavior drift: reset token persistence strategy may not match secure hashed-token expectation.
- Migration recommendation: hash reset tokens at write and compare hash at reset.

## 2.2 Vendor plan and subscription fields

### Doc expectation
- plan upgrade and premium behavior consistency.

### Code status
- Vendor has currentPlan and activeSubscriptionId.
- VendorSubscription has planKey, status, paymentStatus, dates.

### Diff
- Normalization drift: plan truth can diverge between vendor.currentPlan and active subscription.
- Recommendation: derive currentPlan from active subscription projection or enforce invariant transactionally.

## 2.3 Slot assignment fields

### Doc expectation
- reliable slot booking and expiry lifecycle.

### Code status
- SlotAssignment includes inventoryId, subscriptionId, start/end, status.
- SlotInventory tracks total/assigned/available.

### Diff
- Behavior drift: assignment flow is not atomic and can violate available count.
- Recommendation: transaction + conditional decrement query.

## 2.4 CMS section schedule fields

### Doc expectation
- scheduled sections render correctly by date and scope.

### Code status
- CMSSection has scheduledFrom/scheduledTo and scope references.
- cms service uses duplicate $or key bug in query object.

### Diff
- Behavior drift: scope/schedule composition can be incorrect.
- Recommendation: rewrite query with explicit $and clauses.

## 2.5 Analytics fields

### Doc expectation
- scalable event aggregation and dashboard insights.

### Code status
- AnalyticsEvent model has event-level fields and indexes.
- daily aggregation job updates listing stats.

### Diff
- Missing field/policy: retention/TTL policy absent.
- Behavior drift: aggregation idempotency marker absent.

## 2.6 Template and dynamic fields

### Doc expectation
- dynamic forms engine and subtype-specific data governance.

### Code status
- ListingTemplate schema is rich.
- listings module does not visibly enforce template fields during create/update.

### Diff
- Behavior drift: template schema exists but validation bridge is incomplete.

---

## 3) Reference Integrity Diff

### 3.1 Listing extension references
- Hotel, Restaurant, ShopCatalog, TribeExperience, KidsActivity, DestinationPackage reference listingId.
- Missing strict orchestrator ensuring base listing and extension records are created/deleted atomically.

### 3.2 Slot and listing references
- assignment optionally references listingId.
- no explicit guard that listing belongs to vendor in assignment service path.

### 3.3 Inquiry references
- inquiry references vendor/listing/user.
- submit path accepts vendorId from payload with validator but not explicit anti-spoof ownership checks for authenticated users.

### 3.4 Wishlist references
- unique index on userId + listingId exists.
- stat updates on listing are separate from wishlist write; consistency can drift under race.

---

## 4) Enum Drift and Semantics Check

### 4.1 Verified stable enums
- USER_ROLES, VENDOR_STATUS, LISTING_STATUS, SUBSCRIPTION_PLANS, SLOT_TYPES, SLOT_STATUS, SUBSCRIPTION_STATUS, CMS_SECTION_TYPES

### 4.2 Potential semantic drift
- auth validator role enum accepts user/vendorAdmin at registration; operational policy for self-promoted vendorAdmin may differ from enterprise governance.
- docs mention verify-email route language; code uses verify-otp endpoint name.

---

## 5) Normalization and Denormalization Diff

### 5.1 Intentional denormalization present
- ListingBase carries aggregate counters and planPriority fields for fast reads.
- Vendor carries currentPlan and stats summary.

### 5.2 Problematic denormalization risks
- counters updated in separate operations from source events can drift.
- vendor currentPlan mirrored outside subscription source of truth.

### 5.3 Recommended normalization stance
- retain denormalized read fields for performance.
- enforce write-time invariants with transactions and reconciliation jobs.

---

## 6) Slot Spec Diff Focus

### Expected from slot booking specs
- strict inventory correctness
- deterministic assignment lifecycle
- reliable expiry

### Actual
- inventory correctness under concurrent assign is not guaranteed.
- expiry job works functionally but no distributed lock in multi-instance runtime.
- assignment-service validation on subscription payment/state is not strict.

### Risk
- direct revenue leakage and dispute potential.

---

## 7) CMS Spec Diff Focus

### Expected
- city override, section scheduling, render composition correctness.

### Actual
- render pipeline exists and caches outputs.
- cms section query bug affects scope/schedule combination.
- no explicit response metadata indicating applied city override source.

### Risk
- incorrect page composition by locale/context.

---

## 8) Vendor Suite Architecture Diff

### Expected
- full operational suite behavior beyond CRUD (availability, booking, capacity).

### Actual
- strong CRUD scaffolding exists.
- commerce operations (booking/order) are broadly absent across suites.

### Risk
- mismatch between product promise and executable capability.

---

## 9) Diff Register by Type

### Missing in code (from available docs intent)
- transaction-safe slot assignment
- broad validator layer for write routes
- dynamic template enforcement at listing write time
- robust postman generator covering full API
- analytics retention policy

### Extra in code (not problematic)
- rich enum surfaces and schema fields that exceed docs in some places (for example media variants, analytics metadata map)

### Wrong/weak references
- potential listing/vendor/inventory mismatch checks not enforced in slot assignment path

### CMS mismatches
- duplicate $or key logic bug in getSectionsByPage

### Analytics mismatches
- daily aggregation without idempotency key

---

## 10) Migration-Risk Annotated Recommendations

1. Slot transactional hardening
- risk level: Critical
- migration complexity: Medium
- frontend impact: Low
- testing scope: High (concurrency)

2. Reset token hashing migration
- risk level: High
- migration complexity: Medium
- frontend impact: Low
- testing scope: Medium

3. CMS query composition fix
- risk level: High
- migration complexity: Low
- frontend impact: Medium
- testing scope: High (render snapshots)

4. Validator expansion
- risk level: High
- migration complexity: Medium
- frontend impact: Medium
- testing scope: High

5. Template-to-listing validation bridge
- risk level: Medium
- migration complexity: High
- frontend impact: Medium
- testing scope: High

6. Analytics TTL and idempotency
- risk level: Medium
- migration complexity: Medium
- frontend impact: Low
- testing scope: Medium

---

## 11) Conclusion
- With available docs, major architectural intent is visible in code.
- The largest spec-to-code deltas are operational integrity and contract discipline, not model absence.
- Closing transactional, validator, and lifecycle gaps will align implementation with enterprise expectations.
