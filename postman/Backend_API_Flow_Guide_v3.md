# Backend API Flow Guide v3

Validated against active routes and validators from source code.

## 1. Auth Bootstrap
1. POST /api/{{apiVersion}}/auth/register
2. POST /api/{{apiVersion}}/auth/login
3. GET /api/{{apiVersion}}/auth/me
Dependency: login stores accessToken, refreshToken, userId, adminToken/vendorToken.

## 2. Role-Aware Setup
1. [ADMIN] POST /api/{{apiVersion}}/vendors/register
2. [ADMIN] PATCH /api/{{apiVersion}}/vendors/{{id}}/approve
3. [VENDOR] GET /api/{{apiVersion}}/vendors/me

## 3. Booking Lifecycle (BookingHub)
1. POST /api/{{apiVersion}}/bookings/{{id}}/pay
2. POST /api/{{apiVersion}}/payments/{{txnId}}/verify
3. PATCH /api/{{apiVersion}}/my/bookings/{{id}}/reschedule
4. PATCH /api/{{apiVersion}}/my/bookings/{{id}}/cancel
Expected side effects: audit events + queue notifications + payment state change.

## 4. Payment Retry
1. POST /api/{{apiVersion}}/bookings/{{id}}/pay
2. POST /api/{{apiVersion}}/payments/{{txnId}}/verify (processing -> captured/failed)
Rollback point: failed verify must not force completed booking state.

## 5. Admin Booking State Machine
1. [ADMIN] PATCH /api/{{apiVersion}}/admin/bookings/{{id}}/approve
2. [ADMIN] PATCH /api/{{apiVersion}}/admin/bookings/{{id}}/checkin
3. [ADMIN] PATCH /api/{{apiVersion}}/admin/bookings/{{id}}/complete
4. [ADMIN] PATCH /api/{{apiVersion}}/admin/bookings/{{id}}/no-show

## 6. Refund Flow
1. POST /api/{{apiVersion}}/bookings/{{id}}/refund
2. [ADMIN] POST /api/{{apiVersion}}/admin/bookings/{{id}}/manual-refund
DB expectation: refund entity + ledger entries + status update.

## 7. Media Lifecycle
1. POST /api/{{apiVersion}}/uploads/single (multipart)
2. PATCH /api/{{apiVersion}}/media/{{id}}/replace
3. PATCH /api/{{apiVersion}}/media/reorder
4. PATCH /api/{{apiVersion}}/media/{{id}}/primary
5. DELETE /api/{{apiVersion}}/media/{{id}}
6. POST /api/{{apiVersion}}/media/{{id}}/restore

## 8. Subscription Lifecycle
1. [VENDOR] POST /api/{{apiVersion}}/subscriptions
2. [VENDOR] PATCH /api/{{apiVersion}}/subscriptions/{{id}}/change-plan
3. [VENDOR] POST /api/{{apiVersion}}/subscriptions/{{id}}/renew
4. [VENDOR] POST /api/{{apiVersion}}/subscriptions/{{id}}/retry
5. [ADMIN] PATCH /api/{{apiVersion}}/subscriptions/{{id}}/activate

## 9. Notification Verification
1. GET /api/{{apiVersion}}/notifications
2. GET /api/{{apiVersion}}/notifications/unread-count
3. PATCH /api/{{apiVersion}}/notifications/{{id}}/read
4. PATCH /api/{{apiVersion}}/notifications/read-all

## 10. GDPR Irreversible Delete
1. POST /api/{{apiVersion}}/auth/step-up
2. POST /api/{{apiVersion}}/security/privacy/forget/me
Precondition: elevated auth required by middleware.

## 11. Finance + Ops Validation
1. POST /api/{{apiVersion}}/security/finance/payout-export
2. POST /api/{{apiVersion}}/security/finance/invoice/hash
3. GET /internal/ops/summary
4. GET /internal/metrics

## Dependency Chain
- login -> accessToken, refreshToken, userId
- vendor create/approve -> vendorId
- booking create/pay/verify -> bookingId
- order checkout/track -> orderId
- upload -> mediaId
- notifications list -> notificationId
- subscriptions create -> subscriptionId
- invoice/payout endpoints -> invoiceId, payoutId

## Response + Side Effects
- Success family: 200/201/202/204
- Validation: 422
- Auth: 401/403
- Audit: admin/security/booking transitions should emit audit events
- Notifications: booking/refund/subscription flows should enqueue notification jobs
