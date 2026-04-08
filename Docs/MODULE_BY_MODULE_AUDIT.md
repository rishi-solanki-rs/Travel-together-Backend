# MODULE_BY_MODULE_AUDIT

## Method
- Scope: each backend module under src/modules and key shared models
- Lens: schema design, indexes, references, validators, controller/service layering, repository correctness, frontend payload impact
- Risk grading: Critical, High, Medium, Low

## Module: auth

### Files reviewed
- src/modules/auth/auth.routes.js
- src/modules/auth/auth.controller.js
- src/modules/auth/auth.service.js
- src/modules/auth/auth.repository.js
- src/modules/auth/auth.validator.js
- src/shared/models/User.model.js

### Strengths
- clear route/controller/service/repository pattern
- account lockout policy exists
- refresh token validation against persisted token exists
- OTP resend and verify flow exists

### Findings
- High: reset token is persisted in directly comparable form via auth.repository setResetToken and findByResetToken.
- Medium: forgotPassword reads passwordResetToken value but does not use it.
- Medium: crypto import in auth.service is unused.
- Medium: refresh token model is single-token-per-user without lineage/versioning.
- Medium: permissions are token-carried and not dynamically refreshed on RBAC changes.
- Low: mixed spacing/formatting in export list.

### Validator posture
- strong zod coverage for auth paths only.

### Frontend payload risks
- none major in auth responses beyond standard user object exposure controls.

### Score
- Correctness: 7.1
- Security hardening: 6.3
- Maintainability: 7.4

## Module: users

### Files reviewed
- src/modules/users/users.routes.js
- src/modules/users/users.controller.js
- src/modules/users/users.service.js
- src/shared/models/User.model.js

### Findings
- Medium: no dedicated validator file for profile update payload constraints.
- Medium: updateProfile allows profile/preferences object replacement without shape-level guard.
- Medium: softDeleteUser has no cascade policies for related records.

### Score
- Correctness: 6.8
- Validation: 4.9
- Maintainability: 7.0

## Module: vendors

### Files reviewed
- src/modules/vendors/vendors.routes.js
- src/modules/vendors/vendors.controller.js
- src/modules/vendors/vendors.service.js
- src/shared/models/Vendor.model.js
- src/shared/models/VendorKYC.model.js

### Findings
- High: role mutation to vendorAdmin is immediate at vendor creation; stronger review-state gate desirable.
- Medium: getVendorProfile and list paths can become heavy with population at scale.
- Medium: currentPlan and activeSubscriptionId dual-source risk without strict invariant checks.
- Medium: vendor staff lifecycle not strongly represented in module API.

### Score
- Correctness: 7.0
- Business process safety: 6.2

## Module: categories

### Files reviewed
- src/modules/categories
- src/shared/models/Category.model.js

### Findings
- Medium: write validator coverage not explicit.
- Medium: cache invalidation strategy across categories/subtypes/templates is fragmented.

### Score
- Correctness: 7.3

## Module: subtypes

### Files reviewed
- src/modules/subtypes
- src/shared/models/SubType.model.js

### Findings
- Medium: searchFilters and cardConfig are schema-rich but runtime enforcement/utilization is partial.
- Low: subtype key and slug uniqueness are good; operational governance for edits not explicit.

### Score
- Correctness: 7.2

## Module: templates

### Files reviewed
- src/modules/templates/templates.service.js
- src/modules/templates/templates.controller.js
- src/modules/templates/templates.routes.js
- src/shared/models/ListingTemplate.model.js

### Findings
- High: listing creation/update does not visibly enforce ListingTemplate field rules against dynamicFields.
- Medium: template cache invalidation exists and is broad (pattern-based).
- Medium: no compatibility strategy for template version migration and existing listings.

### Score
- Correctness: 6.5
- Extensibility: 8.0

## Module: pages

### Files reviewed
- src/modules/pages/pages.service.js
- src/modules/pages/pages.controller.js
- src/modules/pages/pages.routes.js
- src/shared/models/Page.model.js

### Findings
- High: renderPage does per-section enrich queries, causing fan-out under section-heavy pages.
- Medium: enrichSection filter uses subtypeId with subtypeKey semantics risk.
- Medium: schedule filtering in render is safe but duplicated with cms scheduling logic.
- Medium: no route-level body validation on page create/update.

### Score
- Correctness: 6.7
- Performance resilience: 5.8

## Module: cms

### Files reviewed
- src/modules/cms/cms.service.js
- src/modules/cms/cms.controller.js
- src/modules/cms/cms.routes.js
- src/shared/models/CMSSection.model.js

### Findings
- High: getSectionsByPage query object has two $or keys; earlier one is overwritten in JS object literal.
- High: this can alter intended page/global selection behavior and return wrong section set.
- Medium: no explicit validation for scheduledFrom <= scheduledTo.
- Medium: cache invalidation uses broad pattern deletion.

### Score
- Correctness: 5.9

## Module: uploads

### Files reviewed
- src/modules/uploads/uploads.routes.js
- src/utils/cloudinaryHelper.js
- src/shared/models/MediaAsset.model.js

### Findings
- High: memory + base64 conversion for each file is expensive under concurrent uploads.
- High: no explicit schema validation for context, role, altText length, order range.
- Medium: delete flow lacks durable retry queue for cloudinary failures.
- Medium: module lacks controller/service separation.

### Score
- Correctness: 6.1
- Stability at scale: 5.2

## Module: listings

### Files reviewed
- src/modules/listings/listings.service.js
- src/modules/listings/listings.controller.js
- src/modules/listings/listings.routes.js
- src/shared/models/ListingBase.model.js

### Findings
- High: createListing updates vendor stats in separate call; no transaction around listing + vendor stats.
- High: listing-template enforcement not integrated.
- Medium: getListingBySlug increments stats with non-atomic read-followed-write path relative to page view stream.
- Medium: no strong validator coverage across write routes.

### Score
- Correctness: 6.6

## Module: search

### Files reviewed
- src/modules/search/search.routes.js
- src/shared/models/ListingBase.model.js

### Findings
- Medium: route-only module with embedded logic and no service abstraction.
- Medium: sortBy and sort composition acceptable but no validator envelope.
- Medium: text search index present; no typo tolerance or advanced search strategy.

### Score
- Correctness: 6.9

## Module: inquiries

### Files reviewed
- src/modules/inquiries/inquiries.routes.js
- src/shared/models/Inquiry.model.js

### Findings
- Medium: good inline zod schema, but module still route-heavy.
- Medium: submit flow performs multiple DB operations synchronously and includes email/notification side effects inline.
- Medium: no queue for notification/email; latency and reliability coupling.

### Score
- Correctness: 7.0

## Module: wishlist

### Files reviewed
- src/modules/wishlist/wishlist.routes.js
- src/shared/models/Wishlist.model.js

### Findings
- High: toggle flow vulnerable to race under concurrent requests.
- Medium: wishlistCount increments/decrements can drift without floor guard and transaction.
- Medium: route-heavy implementation, no service layer.

### Score
- Correctness: 5.9

## Module: notifications

### Files reviewed
- src/modules/notifications/notifications.routes.js
- src/shared/models/Notification.model.js

### Findings
- Medium: CRUD-like behavior is clean.
- Medium: no retention strategy/TTL for deleted notifications.
- Low: read-all operation does not filter isDeleted.

### Score
- Correctness: 7.1

## Module: seo

### Files reviewed
- src/modules/seo/seo.routes.js
- src/shared/models/SEOConfig.model.js

### Findings
- Low: method name typo getBySlugor.
- Medium: write payload lacks explicit validator in route.

### Score
- Correctness: 7.2

## Module: analytics

### Files reviewed
- src/modules/analytics/analytics.service.js
- src/modules/analytics/analytics.controller.js
- src/modules/analytics/analytics.routes.js
- src/shared/models/AnalyticsEvent.model.js
- src/jobs/analyticsAggregatorJob.js

### Findings
- High: analytics event collection has no TTL retention.
- High: aggregator increments daily stats without idempotency marker.
- Medium: trackEvent intentionally swallows errors; operational visibility limited.

### Score
- Correctness: 6.4

## Module: plans

### Files reviewed
- src/modules/plans/plans.service.js
- src/shared/models/SubscriptionPlan.model.js

### Findings
- Medium: CRUD is straightforward.
- Medium: cache-only invalidation on update/create but no schema-level constraints for pricing completeness.

### Score
- Correctness: 7.3

## Module: subscriptions

### Files reviewed
- src/modules/subscriptions/subscriptions.service.js
- src/shared/models/VendorSubscription.model.js

### Findings
- High: create and activate paths are not transactional with vendor state update.
- Medium: cancellation flow does not ensure downstream slot revocation.
- Medium: status and paymentStatus transitions are permissive.

### Score
- Correctness: 6.2

## Module: slots

### Files reviewed
- src/modules/slots/slots.service.js
- src/modules/slots/slots.controller.js
- src/modules/slots/slots.routes.js
- src/shared/models/SlotInventory.model.js
- src/shared/models/SlotAssignment.model.js

### Findings
- Critical: non-transactional assignment with inventory decrement race.
- High: assign route has no body validation.
- High: no subscription state hard-check inside assignSlot.
- Medium: featured ordering uses priority only; tie behavior not explicit.

### Score
- Correctness: 4.8

## Module: monetization

### Files reviewed
- src/modules/monetization/monetization.routes.js

### Findings
- Medium: dashboard is useful summary but route-layer aggregation only.
- Medium: no historical trend endpoint.

### Score
- Correctness: 6.9

## Module: luckyDraw

### Files reviewed
- src/modules/luckyDraw/luckyDraw.service.js
- src/jobs/luckyDrawPickerJob.js

### Findings
- High: winner selection uses Math.random sorting, not cryptographically strong.
- Medium: anti-duplication safeguards exist but fairness audit trail can be improved.

### Score
- Correctness: 6.3

## Module: reports

### Files reviewed
- src/modules/reports/reports.routes.js

### Findings
- Medium: route-only analytics/report module.
- Medium: no validator contracts for startDate/endDate.

### Score
- Correctness: 6.8

## Vendor Suite Modules (overview score)
- hotels: 6.3
- thingsToDo: 6.2
- restaurants: 7.1
- shops: 6.9
- tribes: 6.5
- kidsWorld: 6.0
- destinations: 6.6

## Validator-by-validator forensic snapshot
- Dedicated validator modules found: 1
- Route-inline validator schema found: 1
- Mutation routes without explicit validator layer: majority
- Highest risk write endpoints without body validators:
- slots.assign, slots.createInventory
- pages.create/update/publish
- cms.create/update/delete/reorder
- uploads.single/multiple/delete
- vendor-suite create/update endpoints

## Shared model indexing quality snapshot
- Good baseline indexes on major collections.
- Missing or weak areas:
- AnalyticsEvent retention index (TTL missing).
- Additional compound indexes may be needed for heavy CMS/page filter combinations.
- Slot assignment query/index coverage is acceptable but does not prevent race conditions.

## Module-by-module hardening priority
1. slots
2. cms
3. uploads
4. subscriptions
5. wishlist
6. pages
7. analytics
8. listings
9. route-heavy modules refactor wave

## Overall conclusion
- Domain partitioning is strong.
- Layering and validation discipline are inconsistent.
- Revenue and concurrency safety is below enterprise bar in slots/subscriptions/wishlist paths.
- The fastest risk reduction is transaction guards + validator expansion + route-to-service extraction.
