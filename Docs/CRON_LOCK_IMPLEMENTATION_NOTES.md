# CRON_LOCK_IMPLEMENTATION_NOTES

## Scope
- src/config/redis.js
- src/jobs/slotExpiryJob.js
- src/jobs/subscriptionRenewalJob.js
- src/jobs/subscriptionSlotReconciliationJob.js
- src/bootstrap/registerCronJobs.js

## Lock Infrastructure
- Added Redis distributed lock primitives:
  - `acquireDistributedLock`
  - `releaseDistributedLock` (owner-safe Lua unlock)
  - `withDistributedLock`
- Lock behavior:
  - lock key with NX + EX
  - owner token tracked per execution
  - lock release only by lock owner

## Jobs Hardened
- `slotExpiryJob`
  - lock key: `cron:slotExpiryJob:lock`
  - duplicate multi-node execution protection
  - per-assignment retry-safe transaction handling
  - failure isolation per assignment with logging
- `subscriptionRenewalJob`
  - lock key: `cron:subscriptionRenewalJob:lock`
  - duplicate multi-node execution protection
  - per-subscription retry-safe transaction handling
  - pre-run mismatch detection + post-run reconciliation logging
- `subscriptionSlotReconciliationJob` (new)
  - lock key: `cron:subscriptionSlotReconciliationJob:lock`
  - periodic orphan mismatch scan and transactional reconciliation

## Scheduler Update
- Registered reconciliation cron:
  - every hour at minute 15

## Operational Notes
- If lock is not acquired, job exits safely and logs skip event.
- Lock TTLs are tuned per job duration window.
- Mismatch reconciliation logs include counts for auditability.
