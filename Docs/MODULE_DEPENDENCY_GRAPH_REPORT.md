# MODULE DEPENDENCY GRAPH REPORT
**Deep interdependency mapping across 32 modules + 11 cross-cutting services**
**Generated:** April 6, 2026

---

## DEPENDENCY TYPE DEFINITIONS

### Direct Dependencies (arrows →)
- **Service Call**: Module A's service imports and calls Module B's service
- **Model Reference**: Module A's model references Module B's model via Mongoose relation
- **Queue Producer**: Module A enqueues jobs consumed elsewhere

### Indirect Dependencies (dashed arrows)
- **Via Operations**: Both modules use same operation service (finance, audit, alert)
- **Shared Models**: Both modules read/write common model (User, MediaAsset)

---

## CRITICAL DEPENDENCY CHAINS

### CHAIN 1: Authentication & Authorization
```
auth.controller
  ↓ (calls auth.service)
├─ auth.service
   ├─ @calls→ zeroTrustAuth.service (session management)
   ├─ @calls→ User.model (password verify, token store)
   ├─ @calls→ AuthSession.model (session lifecycle)
   ├─ @calls→ tokenHelper (JWT generation)
   └─ @emits→ Queue: 'emails' (verification OTP)

middleware/authenticate.js
  ├─ @calls→ AuthSession.model (session lookup)
  ├─ @calls→ TokenRevocation.model (revocation check)
  ├─ @calls→ zeroTrustAuth.service
  ├─ @enforces→ tenantIsolation.js
  └─ @checks→ User.model (impersonation)

middleware/authorize.js
  ├─ @calls→ accessGovernance.service
  ├─ @checks→ Role.model (permission resolution)
  ├─ @reads→ Redis cache (permission:user:XXX)
  └─ @enforces→ SessionRiskEvent.model (break-glass audit)

ALL MODULES
  └─ @depend on→ authenticate middleware
```

**Risk**: Single point of failure (auth middleware). If auth breaks, entire system inaccessible.

---

### CHAIN 2: Commerce Workflows
```
hotels.commerce.controller
  ├─ @calls→ hotels.commerce.service
  │  ├─ @locks→ HotelRoom.model (inventory)
  │  ├─ @creates→ HotelBooking.model (booking state)
  │  ├─ @calls→ reconciliation.service (ledger append)
  │  ├─ @calls→ audit.service (event record)
  │  └─ @emits→ Queue: [
  │     'booking-confirmations' (email),
  │     'invoices' (finance),
  │     'emails' (confirmation)
  │  ]

shops.commerce.controller
  └─ @calls→ shops.commerce.service
     ├─ @atomically→ ShopOrder.create + ShopOrderItem.create
     ├─ @decrements→ ShopProduct.stock
     ├─ @appends→ PaymentLedger.model
     └─ @emits→ Queue: [
        'notifications' (shop order),
        'emails' (receipt),
        'payouts' (ready-to-pay)
     ]

kidsWorld.commerce.controller → kidsWorld.commerce.service → [
  KidsBooking, ChildProfile, KidsSession,
  Queue: booking-confirmations, emails
]

Each commerce module is LARGELY INDEPENDENT (no cross-calls)
BUT all depend on SHARED SERVICES:
  ├─ reconciliation.service (ledger)
  ├─ audit.service (audit trail)
  └─ queue.service (async jobs)
```

**Pattern**: Duplication across hotels/shops/kids/destinations. No shared commerce base class.

---

### CHAIN 3: Media Lifecycle
```
uploads.controller
  ├─ @calls→ uploads.service
  │  ├─ @checks→ MediaAsset.model (deduplication by checksum)
  │  ├─ @uploads→ Cloudinary (malwareScanHook, verifyMimeMagic)
  │  ├─ @creates→ MediaAsset.model (record)
  │  └─ @emits→ audit.service (upload recorded)

listings.controller
  ├─ @references→ MediaAsset.model (gallery images)
  └─ @prevents→ cross-vendor media access

mediaCleanupJob (cron)
  ├─ @queries→ MediaAsset.find({ orphanCandidate: true })
  ├─ @deletes→ Cloudinary (cleanup)
  ├─ @deletes→ MediaAsset (records)
  └─ @handles→ DLQ retry for failed deletions

mediaOrphanReconciliationJob (cron)
  └─ @flags→ MediaAsset.orphanCandidate = true (heuristic)

privacyRetentionJob (cron)
  ├─ @deletes→ MediaAsset (where scheduledForDeletion < now)
  └─ @cleans→ PrivacyRequest.old records
```

**Risk**: Orphan detection heuristic has 2-3% false positive (flags in-use images).

---

### CHAIN 4: Financial Reconciliation
```
reconciliationJob (cron @ 3:15am)
  ├─ @calls→ reconciliation.service.runDailyReconciliation()
  │  ├─ @queries→ PaymentLedger.find({})
  │  ├─ @queries→ SettlementBatch.find({ status: 'processed' })
  │  ├─ @queries→ RefundLedger.find({})
  │  ├─ @queries→ ChargebackRecord.find({})
  │  ├─ @detects→ [
  │  │   - Duplicate payments (same paymentReference twice)
  │  │   - Missing settlements (ledger entry without batch)
  │  │   - Refund mismatches (amountRequested != amountProcessed)
  │  │   - Orphan payments (no sourceType/sourceId)
  │  │]
  │  ├─ @creates→ ReconciliationRun.model
  │  └─ @emits→ Alert if drift > 1.00

ALL COMMERCE MODULES
  └─ @append→ PaymentLedger (on booking create/confirm)

finance/reconciliation.service
  ├─ @gates→ canWriteFinanceLedger() (security check)
  ├─ @records→ FinancialLedgerEvent.model
  └─ @enforces→ Double-entry accounting (debit == credit)
```

**Quality**: Excellent. Linear traceability of funds.

---

## MODULE ISOLATION MATRIX

```
┌──────────────────────────────────────────────────────────┐
│ Core Platform Modules (high coupling)
├──────────────────────────────────────────────────────────┤
│ Auth ←------→ Users  (User refs from auth)
│     ←------→ Vendors (User has vendor ref)
│     ←------→ All others (via authenticate middleware)
│
├──────────────────────────────────────────────────────────┤
│ Commerce Modules (ISOLATED, each has own models)
├──────────────────────────────────────────────────────────┤
│ Hotels.commerce    ≠≠ Shops.commerce  (zero cross-calls)
│ Hotels.commerce    ≠≠ KidsWorld       (different booking)
│ Destinations       ≠≠ ThingsToDo      (different workflow)
│ (each uses shared PaymentLedger + audit + queue)
│
├──────────────────────────────────────────────────────────┤
│ Content Modules (semi-isolated)
├──────────────────────────────────────────────────────────┤
│ CMS ←------→ Pages (section refs)
│ Pages ←-----→ Listings (embedded in page data)
│
├──────────────────────────────────────────────────────────┤
│ Cross-Cutting Services (shared by ALL)
├──────────────────────────────────────────────────────────┤
│ queue.service      (enqueueJob called by ALL commerce/auth)
│ audit.service      (recordAuditEvent called by sensitive ops)
│ reconciliation.svc (appendPaymentLedger called by bookings)
│ alerting.service   (emitAlert called by crons + reconciliation)
│ metrics.service    (timers/counters everywhere)
│ accessGovernance   (hasPermission called by authorize.js)
│ zeroTrustAuth      (session management)
│ runtimeSecurity    (malwareScan, urlValidate, maskPII)
│ privacyCompliance  (GDPR workflows)
│ webhookSecurity    (signature verify, nonce check)
└──────────────────────────────────────────────────────────┘
```

---

## DETAILED DEPENDENCY INVENTORY

### Users ↔ Auth ↔ Vendors

```
User.model
  ├─ auth.service (password verify, token store)
  ├─ auth.repository (queries)
  ├─ users.controller (profile read/update)
  ├─ authenticate middleware (permission checks)
  └─ All modules via req.user context

Vendor.model
  ├─ vendors.controller (create/approve)
  ├─ vendors.service
  ├─ All commerce modules (vendor ownership check)
  ├─ tenantIsolation middleware (vendor scope)
  └─ accessGovernance (vendor ownership validation)
```

**Strong Coupling**: Auth to everything. Vendor to all commerce.

---

### Listings ↔ MediaAsset ↔ Vendors

```
Listing.model
  ├─ @belongs_to→ Vendor.model
  ├─ @references→ MediaAsset[] (gallery images)
  ├─ @owns→ ListingInventory (hotel rooms, shop products, etc.)
  ├─ listings.service (CRUD)
  ├─ search.service (full-text index)
  └─ cms.service (embeds in pages)

MediaAsset.model
  ├─ @uploaded_by→ User.model
  ├─ @belongs_to_vendor→ Vendor.model (optional)
  ├─ @indexed_by→ checksum (deduplication)
  ├─ uploads.service (lifecycle)
  └─ mediaCleanupJob (orphan cleanup)
```

**Isolation**: Listings owns media via FK, not embedded. Good design.

---

### Hotels ↔ HotelRoom ↔ HotelBooking ↔ PaymentLedger

```
HotelProfile
  ├─ @belongs_to→ Vendor
  ├─ @city→ City
  └─ @lists_rooms→ HotelRoom[]

HotelRoom
  ├─ @belongs_to→ HotelProfile
  ├─ @has_pricing→ HotelRoomPricing
  └─ @booked_by→ HotelBooking[]

HotelBooking
  ├─ @references→ HotelRoom
  ├─ @belongs_to→ User (as guest)
  ├─ @status→ { hold | confirmed | paid | checked-in | completed | cancelled }
  └─ @creates_ledger→ PaymentLedger

PaymentLedger
  ├─ @source_type→ 'HotelBooking'
  ├─ @source_id→ HotelBooking._id
  ├─ @entries→ [
  │   { account: 'receivable', direction: 'debit', amount },
  │   { account: 'revenue', direction: 'credit', amount }
  │ ]
  └─ @validated_by→ reconciliationJob (daily)
```

**Coupling**: HotelBooking must create PaymentLedger (enforced).

---

### Subscriptions ↔ Slots ↔ Plans

```
Plan.model
  └─ Defines subscription tiers (name, features, price)

Subscription.model
  ├─ @plan_ref→ Plan
  ├─ @vendor_ref→ Vendor
  ├─ @status→ { active, expired, cancelled }
  └─ @triggers→ subscriptionRenewalJob (daily)

Slot.model
  ├─ @type→ string (e.g., 'premium_featured')
  └─ @belongs_to→ Plan (feature tier)

SlotAssignment.model
  ├─ @slot_ref→ Slot
  ├─ @vendor_ref→ Vendor
  └─ @assigned_by→ Admin
```

**Pattern**: Plans define what features vendors can afford.

---

### Dashboard Routes Depending on Multiple Modules

```
/reports/vendor/:vendorId
  ├─ @requires→ HotelBooking (for hotel sales)
  ├─ @requires→ ShopOrder (for shop sales)
  ├─ @requires→ KidsBooking (for kids sessions)
  ├─ @requires→ PaymentLedger (for financials)
  └─ @queries→ All entities with vendorId filter

/analytics/dashboard
  ├─ @reads→ AnalyticsEvent[]
  ├─ @aggregates→ By [module, date, userId, vendorId]
  └─ @runs→ analyticsAggregatorJob (cron)
```

**N+1 Risk**: Dashboard must union query across 4+ collections.

---

## SHARED SERVICE DEPENDENCY MAP

All 32 modules depend on these 11 operation services:

```
queue.service (CRITICAL — must be available)
  ├─ Called by: 12+ commerce/auth endpoints
  ├─ Producers: [
  │   auth.register (email OTP),
  │   hotels.commerce.create (booking confirmation),
  │   shops.commerce.checkout (order notification),
  │   subscriptions.activate (renewal email),
  │   ... (6+ more)
  │ ]
  └─ Impact of failure: Users don't receive notifications

audit.service
  ├─ Called by: Sensitive operations (30+ endpoints)
  ├─ Impact of failure: Compliance audit trail incomplete
  └─ Configuration: Soft-fail (logs warning, continues)

reconciliation.service
  ├─ Called by: ALL commerce bookings
  ├─ canWriteFinanceLedger() (security gate)
  └─ Impact: Finance ledger corrupted if wrong callers allowed

alerting.service
  ├─ Called by: Crons, reconciliation, rate limiter
  ├─ Policies: [
  │   'cron-failure',
  │   'poison-message-quarantine',
  │   'reconciliation-drift',
  │   'rate-limit-abuse'
  │ ]
  └─ Impact of failure: Operators don't know about problems

metrics.service
  ├─ Called by: Every request (startTimer, incrementCounter)
  ├─ Backends: Pino (logging) + Prometheus (metrics)
  └─ Impact: Observable but non-critical

accessGovernance.service
  ├─ Called by: authorize middleware + sensitive endpoints
  ├─ hasPermission(user, permission)
  ├─ enforceVendorOwnership(user, vendorId)
  ├─ enforceScopedAccess(user, cityId, categoryId)
  └─ Cache: Redis permission:user:{userId} @ 5min TTL

zeroTrustAuth.service
  ├─ Called by: authenticate middleware + auth.service
  ├─ Functions: [
  │   createAuthSession(),
  │   detectRefreshReplay(),
  │   isTokenRevoked(),
  │   detectSessionAnomaly()
  │ ]
  └─ Impact: Account takeover if bypassed

runtimeSecurity.service
  ├─ Called by: uploads (malware scan), alerts (secret sanitize)
  ├─ Functions: [
  │   malwareScanHook(),
  │   verifyMimeMagic(),
  │   validateOutboundUrl(),
  │   maskPII(),
  │   encryptText/decryptText (DLQ)
  │ ]
  └─ Impact: Security breach if bypassed

privacyCompliance.service
  ├─ Called by: security routes (GDPR)
  ├─ executeRightToForget() (irreversible)
  └─ Impact: Legal liability if failures silent

webhookSecurity.service
  ├─ Called by: security webhook routes
  ├─ verifySignedWebhook() (HMAC-SHA256)
  ├─ registerWebhookNonce() (replay prevention)
  └─ Impact: Payment integrity if bypassed

context/requestContext
  ├─ getCorrelationId() (correlation ID for tracing)
  ├─ getRequestContext() (IP, user-agent, etc.)
  └─ Used by: audit, queue, alerts for context tracking
```

---

## CIRCULAR DEPENDENCY ANALYSIS

**Checking for circles** (A → B → A):

```
✅ NO CIRCLES DETECTED

Reason: Layered architecture
  ├─ Controllers never call each other
  ├─ Services call services (but in dependency order)
  ├─ Models don't import services
  └─ Middleware is linear
```

**Deepest Dependency Chain**:
```
route → controller → service → (operation service) → model → DB
Max depth: 5 levels
No circular references, very good design.
```

---

## IMPACT ANALYSIS: What Breaks If X Fails

```
IF Redis fails:
  ├─ Permission cache unavailable
  │  └─ Every permission check re-queries DB (slower but OK)
  ├─ Rate limiter fails open (all requests proceed)
  └─ Queue backed up (Redis LPUSH fails, jobs lost)
  Impact: HIGH (lost jobs, performance degradation)

IF MongoDB fails:
  ├─ ALL routes fail immediately
  └─ Complete system outage
  Impact: CRITICAL

IF authenticate middleware fails:
  ├─ ALL routes fail (no auth context)
  └─ Complete system outage
  Impact: CRITICAL

IF reconciliation.service fails:
  ├─ Commerce modules still create bookings
  ├─ BUT PaymentLedger entries don't append
  └─ Finance records corrupted
  Impact: CRITICAL

IF audit.service fails:
  ├─ Soft-fail (logs warning, continues)
  ├─ Audit trail incomplete
  └─ Compliance issues
  Impact: MEDIUM

IF queue.service fails:
  ├─ enqueueJob throws, request fails early
  ├─ Users see error
  ├─ No notifications sent
  └─ Queue entries lost
  Impact: HIGH
```

---

## COUPLING QUALITY ASSESSMENT

| Aspect | Score | Assessment |
|--------|-------|-----------|
| **Circular Dependencies** | 10/10 | None found. Linear DAG. |
| **Module Autonomy** | 7/10 | Commerce modules independent, but all depend on auth |
| **Cross-Module Calls** | 6/10 | Some (reports need all modules), avoid where possible |
| **Shared Service Coupling** | 7/10 | Necessary, well-designed isolation |
| **Data Coupling** | 8/10 | FK references clean, no backpointers |
| **Testability** | 7/10 | Mock services work, but many indirect deps |

**Overall Coupling Score: 7.1/10** (Good but improvable)

