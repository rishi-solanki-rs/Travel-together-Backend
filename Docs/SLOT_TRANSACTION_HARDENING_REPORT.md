# SLOT_TRANSACTION_HARDENING_REPORT

## Scope
- src/shared/utils/withTransaction.js
- src/modules/slots/slots.service.js
- src/shared/models/SlotAssignment.model.js
- src/config/env.js

## Critical Risk Closed
- TD-001: non-transactional slot assignment race and oversubscription

## Implementation Summary
- Added reusable transaction wrapper upgrades:
  - nested-safe execution context
  - commit/rollback safety
  - correlationId passthrough
  - retry hook support (`maxAttempts`, `retryHook`)
  - structured transaction metadata on bubbled errors
- Introduced feature-flagged transactional assignment path in slots:
  - feature flag: `FF_SLOT_TX_ASSIGN`
  - default behavior: enabled unless explicitly set false
- Converted assignment flow to atomic sequence:
  1. entitlement and ownership checks
  2. idempotency duplicate lookup
  3. atomic conditional inventory decrement (`findOneAndUpdate` with slot guards)
  4. assignment creation only after successful decrement
  5. listing premium sync inside same transaction
- Added strict slot scope validation for city/category/subtype.
- Added deterministic tie-break sorting for featured slots (`priority`, `endDate`, `createdAt`, `_id`).
- Added helper flows for safe revocation/reconciliation:
  - `revokeAssignmentsBySubscription`
  - `detectSubscriptionSlotMismatches`
  - `reconcileOrphanAssignments`
- Strengthened idempotency storage semantics:
  - `SlotAssignment.idempotencyKey` index updated to sparse unique.

## Safety Guarantees Achieved
- assignment creation cannot occur if inventory decrement fails.
- negative `availableSlots` from assignment path is prevented.
- duplicate retries with same idempotency key return prior assignment.
- listing featured state updates are rollback-safe with transaction scope.

## Public API Compatibility
- no endpoint path changes.
- no route contract changes.
- no payload shape changes for existing slot endpoints.
