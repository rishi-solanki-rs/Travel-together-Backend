# VENDOR_SUITE_DEEP_AUDIT

## Scope
- Suites audited:
- A) hotels
- B) things-to-do
- C) restaurants
- D) shops
- E) world tribes
- F) kids world
- G) destination packages

## Cross-suite baseline checks
- Listing linkage uses listingId references in extension models.
- Most suite endpoints rely on isVendorAdmin auth, but body validation is largely missing.
- Pricing semantics differ by suite and are not normalized at contract level.
- Search-readiness depends heavily on ListingBase fields; extension-specific filters are thin.

---

## A) Hotel Suite Forensics

### Files reviewed
- src/modules/hotels/hotels.routes.js
- src/modules/hotels/hotels.controller.js
- src/modules/hotels/hotels.service.js
- src/shared/models/Hotel.model.js
- src/shared/models/HotelRoom.model.js
- src/shared/models/HotelPricingCalendar.model.js

### 1. Current business flow
- listing created in listings module
- hotel profile created by listingId
- rooms added under hotelId
- pricing calendar bulk upsert by room/date
- optional blackout entries written to pricing calendar

### 2. Schema design quality
- Hotel, HotelRoom, and HotelPricingCalendar are properly separated.
- Room-level structure is strong for inventory and pricing dimensions.
- Calendar model supports seasonal and date-specific override patterns.

### 3. Missing operational models
- No booking/reservation model in suite.
- No booking status lifecycle for pending/confirmed/cancelled/refunded.
- No payment transaction model tied to room nights.

### 4. Pricing logic maturity
- Base pricing and per-date pricing exist.
- Effective price composition logic at read time is not centralized in service.
- No tax/fee policy engine integration visible.

### 5. Media flow
- Media lifecycle is generic via uploads and listing/gallery fields.
- No suite-level enforcement for minimum cover/room image standards.

### 6. Subtype/template support
- Template system exists globally, but suite does not enforce template field completeness before publish.

### 7. Search/filter readiness
- Relies on ListingBase text and pricing fields.
- Room/facility/date-specific availability filters are not integrated in search route.

### 8. Frontend rendering payloads
- Hotel detail likely requires listing + hotel profile + rooms + optional calendar data.
- Current paths do not provide a single optimized contract for date-aware pricing display.

### 9. Analytics readiness
- Generic listing analytics works.
- No room-level conversion metrics or booking funnel events.

### 10. Monetization readiness
- Listing can be featured via slots.
- Missing booking engine means direct hotel commerce monetization is incomplete.

### Hotel suite key findings
- High: missing booking model blocks true room inventory monetization.
- High: blackout writes do not guarantee blackout enforcement in booking flow.
- Medium: room CRUD has no body validator contracts.
- Medium: pricing calendar upsert lacks transaction relation with business events.

### Hotel suite score
- Business completeness: 5.5
- Technical correctness: 6.4
- Monetization readiness: 6.0

---

## B) Things-To-Do Suite Forensics

### Files reviewed
- src/modules/thingsToDo/thingsToDo.routes.js
- src/modules/thingsToDo/thingsToDo.controller.js
- src/modules/thingsToDo/thingsToDo.service.js
- src/shared/models/TourItinerary.model.js
- src/shared/models/TourDeparture.model.js

### 1. Current business flow
- itinerary created per listing
- departure entries created per itinerary
- upcoming departures fetched with date window

### 2. Schema design quality
- itinerary and departure split is appropriate.
- departure model supports scheduling and operational status.

### 3. Missing operational models
- no booking/seat reservation entity for departures.
- no participant manifest model.

### 4. Pricing logic
- depends on listing-level pricing and departure data.
- no dynamic per-departure fare model visible.

### 5. Media flow
- inherited from listing/media.
- no activity-level media policy enforcement.

### 6. Subtype/template support
- present at listing layer, not strictly suite-enforced.

### 7. Search/filter readiness
- search endpoint not enriched with departure date or availability filters.

### 8. Frontend payloads
- itinerary/departure likely fetched separately; no consolidated public itinerary payload contract.

### 9. Analytics readiness
- event-level analytics available by listing.
- no departure-level demand analytics rollups.

### 10. Monetization readiness
- slot monetization available.
- booking monetization not complete due missing reservation model.

### Things-to-do findings
- High: no departure capacity enforcement transaction path.
- Medium: cancellation endpoint updates status only; downstream effects not modeled.
- Medium: no explicit validators on create/update/cancel payloads.

### Things-to-do score
- Business completeness: 5.8
- Technical correctness: 6.3
- Monetization readiness: 6.1

---

## C) Restaurant Suite Forensics

### Files reviewed
- src/modules/restaurants/restaurants.routes.js
- src/modules/restaurants/restaurants.controller.js
- src/modules/restaurants/restaurants.service.js
- src/shared/models/Restaurant.model.js
- src/shared/models/MenuCategory.model.js
- src/shared/models/MenuItem.model.js

### 1. Current business flow
- create restaurant profile per listing
- create menu categories
- add/update/delete menu items
- fetch full menu by restaurant

### 2. Schema design quality
- category/item decomposition is healthy.
- supports ordering and availability flags.

### 3. Missing operational models
- no table booking model.
- no order/cart model.

### 4. Pricing logic
- item prices likely reside at item level.
- no discount campaign application shown.

### 5. Media flow
- menu media can be stored via generic uploads.
- no strict image ratio/size constraints for menu cards.

### 6. Subtype/template support
- available globally; not strictly enforced during profile publish.

### 7. Search/filter readiness
- listing-level search only.
- no cuisine/menu-aware search path in search module.

### 8. Frontend payloads
- full menu endpoint performs category query + item query and joins in app layer.
- potential scale issue for very large menus without pagination.

### 9. Analytics readiness
- listing-level metrics only.
- no menu-item click/order proxy analytics.

### 10. Monetization readiness
- slot boosting works.
- direct commerce monetization not integrated.

### Restaurant findings
- Medium: full menu retrieval may grow heavy for large catalogs.
- Medium: menu CRUD lacks zod/joi contract at route edge.
- Low: deletion strategy is soft deactivate; cleanup policy absent.

### Restaurant score
- Business completeness: 6.7
- Technical correctness: 7.1
- Monetization readiness: 6.5

---

## D) Shop Suite Forensics

### Files reviewed
- src/modules/shops/shops.routes.js
- src/modules/shops/shops.controller.js
- src/modules/shops/shops.service.js
- src/shared/models/ShopCatalog.model.js
- src/shared/models/ProductItem.model.js

### 1. Current business flow
- create catalog per listing
- add products
- update stock and product metadata

### 2. Schema design quality
- catalog/product split is correct.
- product has active/deleted/in-stock style lifecycle fields.

### 3. Missing operational models
- no cart/order/checkout entity.
- no SKU-level variant model beyond item-level fields.

### 4. Pricing logic
- product-level price likely exists but no promotion engine.
- no price history model.

### 5. Media flow
- generic uploads usable.
- no product media variant policy enforcement.

### 6. Subtype/template support
- global template exists, not enforced as gate.

### 7. Search/filter readiness
- getProducts supports collection/inStock/isFeatured but no full-text product search in suite route.

### 8. Frontend payloads
- paginated product list is available.
- no explicit card payload contract with computed flags.

### 9. Analytics readiness
- listing level only.
- no item-level conversion counters.

### 10. Monetization readiness
- slots available.
- direct ecommerce monetization absent.

### Shop findings
- Medium: updateStock is simple and can race under concurrent decrements if used for order simulation.
- Medium: missing validators for catalog/product mutation payloads.

### Shop score
- Business completeness: 6.2
- Technical correctness: 6.9
- Monetization readiness: 6.3

---

## E) World Tribes Suite Forensics

### Files reviewed
- src/modules/tribes/tribes.routes.js
- src/modules/tribes/tribes.controller.js
- src/modules/tribes/tribes.service.js
- src/shared/models/TribeExperience.model.js

### 1. Current business flow
- create/update experience profile
- append/update schedule entries

### 2. Schema design quality
- experience + schedule model is compact and suitable for storytelling products.

### 3. Missing operational models
- no booking/participation model.
- no capacity management model.

### 4. Pricing logic
- pricing appears listing-level.
- schedule-level differential pricing not explicit.

### 5. Media flow
- inherited via listing/media.

### 6. Subtype/template support
- available globally.

### 7. Search/filter readiness
- no dedicated tribe-experience search filters exposed.

### 8. Frontend payloads
- schedule updates overwrite entry object and may drop fields if partial update used.

### 9. Analytics readiness
- generic listing analytics only.

### 10. Monetization readiness
- slot monetization yes.
- direct booking monetization no.

### Tribes findings
- Medium: updateScheduleEntry replaces schedule item with provided object; partial updates are risky.
- Medium: no validation schemas for schedule entries.

### Tribes score
- Business completeness: 5.9
- Technical correctness: 6.5

---

## F) Kids World Suite Forensics

### Files reviewed
- src/modules/kidsWorld/kidsWorld.routes.js
- src/modules/kidsWorld/kidsWorld.controller.js
- src/modules/kidsWorld/kidsWorld.service.js
- src/shared/models/KidsActivity.model.js

### 1. Current business flow
- create activity profile
- add sessions
- update availability counters

### 2. Schema quality
- session-based model is appropriate.

### 3. Missing operational models
- no booking registration model.
- no guardian/child participant records.

### 4. Pricing logic
- likely listing/session level without invoice/order.

### 5. Media flow
- inherited generic pipeline.

### 6. Subtype/template support
- present but not strict.

### 7. Search/filter readiness
- no session/time based search integration.

### 8. Frontend payloads
- no dedicated schedule payload endpoint optimized for calendar UIs.

### 9. Analytics readiness
- listing-level only.

### 10. Monetization readiness
- slot monetization available.
- activity booking monetization incomplete.

### Kids world findings
- High: updateSessionAvailability uses $inc without lower-bound condition.
- Medium: no validators for session creation/update.

### Kids world score
- Business completeness: 5.6
- Technical correctness: 6.0

---

## G) Destination Packages Suite Forensics

### Files reviewed
- src/modules/destinations/destinations.routes.js
- src/modules/destinations/destinations.controller.js
- src/modules/destinations/destinations.service.js
- src/shared/models/DestinationPackage.model.js

### 1. Current business flow
- create package per listing
- update package details
- append departure dates
- list packages by type

### 2. Schema design quality
- package model is coherent for travel package metadata.

### 3. Missing operational models
- no booking and passenger manifest model.
- no quote acceptance model.

### 4. Pricing logic
- package pricing exists but lacks explicit strategy semantics across per-person vs package total in API contracts.

### 5. Media flow
- shared media path only.

### 6. Subtype/template support
- globally available, no strict enforcement.

### 7. Search/filter readiness
- by package type exists; richer filters absent.

### 8. Frontend payloads
- basic payload available; no compact cards + detailed payload separation.

### 9. Analytics readiness
- listing-level analytics only.

### 10. Monetization readiness
- slot monetization available.
- package booking monetization incomplete.

### Destinations findings
- Medium: no payload validators for package/departure writes.
- Medium: sort by nested pricing path assumes consistent schema population.

### Destinations score
- Business completeness: 6.0
- Technical correctness: 6.6

---

## Cross-suite pricing and monetization forensic conclusions
- monetization today is primarily visibility-based (plans + slots).
- transactional commerce (booking/order) is largely absent across suites.
- this creates a gap between lead-gen model and full marketplace expectations described in docs.

## Cross-suite media forensic conclusions
- infrastructure exists for variant generation.
- suite-specific media contracts are not codified, creating inconsistent frontend experiences.

## Cross-suite search/filter forensic conclusions
- core search is listing-centric.
- extension-specific filtering is weak, limiting discoverability for advanced user intent.

## Cross-suite analytics conclusions
- listing-level analytics and event tracking exist.
- suite-specific funnel analytics are not mature.

## Priority remediation for suites
1. Introduce booking/order primitives per suite family.
2. Add strict write validators for all suite mutation routes.
3. Implement suite-specific search facets backed by indexes.
4. Add compact vs detailed frontend payload contracts.
5. Add suite-specific analytics dimensions and conversion events.

## Vendor suite readiness matrix
- Hotels: Lead-gen ready, booking-light, not full commerce-ready
- Things-To-Do: Lead-gen ready, departure scheduling ready, booking-light
- Restaurants: Menu showcase ready, ordering/booking not integrated
- Shops: Catalog ready, order pipeline absent
- Tribes: Experience showcase ready, booking absent
- Kids World: Session showcase ready, capacity race must be fixed
- Destinations: Package showcase ready, booking/quote workflow shallow
