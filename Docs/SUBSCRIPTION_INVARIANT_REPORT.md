# SUBSCRIPTION_INVARIANT_REPORT

## Scope
- src/modules/subscriptions/subscriptions.service.js
- src/modules/slots/slots.service.js
- src/modules/vendors/vendors.service.js
- src/jobs/subscriptionSlotReconciliationJob.js

## Critical Risks Closed
- TD-002: subscription-slot entitlement drift
- TD-015: weak scope and ownership/invariant enforcement in premium slot flows

## Invariants Enforced
- assignment entitlement requires subscription:
  - `status = active`
  - `paymentStatus = paid`
  - `endDate >= now`
- vendor-subscription coherence:
  - active subscription mismatch blocked during assignment and cancellation paths
- vendor entitlement state sync:
  - transactional updates through `syncVendorEntitlement` helper
- downgrade safety behavior:
  - activating a new subscription expires previous active subscription
  - premium assignments linked to replaced subscription are revoked
- cancel/expire safety:
  - premium assignments are revoked through shared slot revocation helpers
  - listing premium state is recomputed after assignment expiry/revocation

## Reconciliation and Detection
- mismatch detector implemented:
  - `detectSubscriptionSlotMismatches`
  - detects missing subscription, unpaid, expired, inactive, vendor mismatch
- orphan reconciliation implemented:
  - `reconcileOrphanAssignments`
  - transactional expiry + inventory recovery + listing state recomputation
- dedicated reconciliation job added:
  - `src/jobs/subscriptionSlotReconciliationJob.js`

## Public API Compatibility
- no route path changes.
- no request/response contract changes.
- validator middleware from phase 2 remains intact.
