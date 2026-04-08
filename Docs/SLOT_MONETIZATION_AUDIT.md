# SLOT_MONETIZATION_AUDIT

## Scope
- src/modules/plans
- src/modules/subscriptions
- src/modules/slots
- src/modules/monetization
- src/jobs/slotExpiryJob.js
- src/jobs/subscriptionRenewalJob.js
- src/shared/models/SubscriptionPlan.model.js
- src/shared/models/VendorSubscription.model.js
- src/shared/models/SlotInventory.model.js
- src/shared/models/SlotAssignment.model.js

## Revenue Engine Forensic Position
- The monetization architecture is directionally correct.
- Core risk lies in non-transactional assignment and lifecycle synchronization.
- If unaddressed, this can produce revenue leakage and inventory drift.

## 1) Plan system forensic

### Plan model quality
- plan keys and priority exist.
- pricing matrix includes monthly/quarterly/halfYearly/annual.
- limits and features support tier differentiation.

### Gaps
- no strict plan transition policy encoded (upgrade, downgrade, prorata rules).
- no immutable plan snapshot versioning strategy beyond copied features/limits into subscription.

## 2) Subscription lifecycle forensic

### createSubscription
- verifies plan and billing cycle amount.
- blocks multiple active subscriptions.

### activateSubscription
- sets ACTIVE and paymentStatus paid.
- computes endDate by billing cycle.
- updates vendor currentPlan and activeSubscriptionId.

### Risks
- create/activate + vendor update are not wrapped in transaction.
- failure between operations can leave inconsistent state.
- cancellation does not explicitly revoke slots tied to subscription.

## 3) Slot inventory and assignment forensic

### Assignment flow
- read inventory
- check availableSlots > 0
- create assignment
- decrement inventory
- set listing featured/premium flags

### Critical race condition
- two concurrent requests can both read availableSlots = 1 and both assign.
- resulting availableSlots can go negative.

### Business impact
- over-sold premium inventory
- ranking inconsistency
- billing disputes

## 4) Slot ranking forensic

### Current ranking
- sort by assignment.priority desc for featured listings.

### Gaps
- no deterministic tie-breakers
- no recency/expiry-aware scoring
- no explicit city/category/subtype fallback cascade if slot pool sparse

## 5) Homepage priority forensic

### Current behavior
- slot-derived featured list returns listingIds by assignment priority.
- listing.planPriority and featured flags are toggled in assignment/expiry logic.

### Gaps
- no transactional guarantee that listing flags and slot assignment state stay consistent under partial failure.

## 6) City premium and subtype boosts forensic

### Data model readiness
- inventory and assignment include city/category/subtype IDs.

### Gaps
- no validator on assign payload to ensure assignment scope aligns with inventory scope.
- possible to pass listing from unrelated city/category if not checked in service.

## 7) Renewal and expiry forensic

### subscriptionRenewalJob
- sends reminder for subscriptions expiring in 7 days.
- marks expired subscriptions and resets vendor plan to free.

### slotExpiryJob
- marks expired slot assignments
- increments inventory availability
- removes listing premium flags
- emits notifications

### Synchronization gap
- subscription expiry and slot expiry are independent jobs.
- slots linked to expired subscription may remain active until their own endDate.

## 8) Slot history and auditability

### Existing fields
- assignedBy, notes, expiredAt, timestamps.

### Gap
- no explicit history array of lifecycle transitions.
- no immutable event log for who changed what and why.

## 9) Upgrade/downgrade risk

### Current state
- vendor.currentPlan updates with activated subscription.

### Risk scenarios
- downgrade while active slots at higher tier still assigned.
- overlap of pending and active subscriptions with undefined precedence.

## 10) Business correctness score
- Plan definition correctness: 8.0
- Subscription state correctness: 6.3
- Slot inventory correctness under concurrency: 3.8
- Ranking correctness: 6.0
- Expiry correctness: 6.4
- End-to-end revenue correctness: 5.7

Overall business correctness score: 5.9 / 10

## 11) Revenue leakage risks
- Critical: double assignment on last slot due race condition.
- High: inconsistent subscription and slot state after partial failures.
- High: missing hard-check on subscription status/payment status in assign path.
- Medium: orphaned assignments if vendor/subscription lifecycle changes are not cascaded.

## 12) Expiry risks
- Medium: multi-instance cron execution without lock can cause duplicate or conflicting updates.
- Medium: reminderSentAt write can fail while email sent, causing resend anomalies.

## 13) Race condition risks
- Critical: assignSlot check-then-act race.
- High: wishlist-like stat races not core monetization but affect perceived premium value metrics.
- Medium: concurrent plan activation/cancellation edge cases.

## 14) Indexing recommendations
- VendorSubscription: add compound index { vendorId:1, status:1, endDate:1 }
- SlotAssignment: add index { inventoryId:1, status:1, endDate:1 }
- SlotAssignment: add index { subscriptionId:1, status:1 }
- SlotInventory: add unique guard index for scope tuple where required by business policy

## 15) Enforcement recommendations

### 15.1 Transactional assign slot
- use session transaction with conditional findOneAndUpdate for inventory decrement.
- only create assignment if decrement succeeds.

### 15.2 Subscription validity gate
- assignSlot must enforce:
- subscription exists
- belongs to vendor
- status ACTIVE
- paymentStatus paid
- subscription.endDate >= now

### 15.3 Scope integrity checks
- listing belongs to vendor
- listing city/category/subtype compatible with inventory scope

### 15.4 Idempotency
- add idempotency key for assign operations to prevent duplicate charges on retries.

## 16) Safe migration plan for slot integrity

Phase A
- add server-side validations and feature flag for transaction mode
- dual-write audit log entries

Phase B
- enable transaction mode for low-traffic inventory types first

Phase C
- backfill integrity checker job to reconcile inventory counts vs assignments

Phase D
- enforce DB-level constraints where possible and alerting thresholds

## 17) Monitoring recommendations
- metrics:
- slots.available negative count
- assignments created per minute by slotType
- assignment failures by reason
- subscription-slot mismatch count

- alerts:
- any availableSlots < 0 critical page
- assignment creation spikes > baseline
- cron duration and failure ratios

## 18) QA scenarios (mandatory)
- concurrent assignment race (20 parallel requests on last slot)
- assignment with expired subscription
- assignment with unpaid subscription
- slot expiry and subscription expiry overlap
- listing mismatch with inventory city/category
- downgrade with active premium slots

## 19) Final forensic verdict
- monetization data model is promising and expressive.
- operational correctness for production finance-grade reliability is not yet achieved.
- transactional integrity and lifecycle invariants must be implemented before scale.
