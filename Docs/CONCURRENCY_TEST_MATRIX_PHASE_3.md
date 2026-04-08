# CONCURRENCY_TEST_MATRIX_PHASE_3

## Test File
- tests/concurrency/slots.transaction.test.js

## Matrix Coverage
1. 20 parallel requests on last slot
- Expected: exactly one success, no oversubscription, inventory floor respected.

2. Unpaid subscription assignment
- Expected: blocked with entitlement failure.

3. Expired subscription assignment
- Expected: blocked with entitlement failure.

4. Downgrade with active premium slot
- Expected: higher-priority premium assignments selected for revocation.

5. Cancel subscription with active slot
- Expected: subscription and linked slot assignment transition to expired/cancelled-safe state.

6. Duplicate retry request
- Expected: idempotent replay returns same assignment, no additional inventory decrement.

7. Inventory scope mismatch
- Expected: rejected when listing scope conflicts with inventory scope.

8. Multi-node cron duplicate simulation
- Expected: lock allows exactly one executor.

## Notes
- Matrix maps directly to phase 3 critical race and invariant risks.
- Public API contracts remain unchanged while concurrency controls are enforced in service and job layers.
