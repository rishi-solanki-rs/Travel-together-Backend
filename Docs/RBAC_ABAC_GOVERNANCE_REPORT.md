# RBAC ABAC GOVERNANCE REPORT

## Scope
- Phase 8B governance controls implemented additively.

## Implemented Controls
1. Dynamic DB-driven permission resolution:
- Permission resolution now merges role permissions (Role -> Permission) and direct user permissions.

2. Cache-safe permission invalidation:
- Redis-backed permission cache with explicit invalidation helper.

3. ABAC vendor resource ownership:
- Vendor ownership checks enforce vendorId boundary for non-admin actors.

4. City/category scoped access:
- Scoped access checks enforce city-admin and category constraints.

5. Finance/admin least privilege roles:
- Finance ledger writes include an authorization hook for API-origin writes.

6. Payout-only finance scopes:
- Payout export route requires finance export permission.

7. CMS publisher/editor reviewer separation:
- Governance service includes cms action partition helper for publish/review/edit permission boundaries.

8. Support impersonation audit mode:
- Admin impersonation header path records impersonation risk events.

9. Time-bound temporary elevation:
- Step-up sets temporary elevation expiry.

10. Break-glass admin override with mandatory audit:
- Break-glass token path records critical SessionRiskEvent audit records.

## Compatibility Notes
- Existing authorize middleware API preserved.
- Existing routes kept intact.
- Added checks are additive and fallback-safe.
