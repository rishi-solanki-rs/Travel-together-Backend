# ARCHITECTURE GAP ANALYSIS
**Project**: Together In India
**Date**: 2026-04-06

## 1. Missing / Hollow Business Suites
While the basic CRUD route wrappers exist, the deep business logic from the Final FRD is missing in these areas:

### A) Hotel Suite Gaps
- **Pricing Calendar Check**: No algorithmic mechanism inside the GET route to dynamically override `basePrice` using the `HotelPricingCalendar.model.js`.
- **Blackout Dates**: Availability subtraction fails to intersect securely with blackout dates.

### B) Things To Do / Tours Gaps
- **Departure Segregation**: Schema exists for `TourDeparture`, but no controller accurately links an `Itinerary` to a `Departure` date dynamically while capping `groupSize.max`.

### C) Restaurant Suite Gaps
- **Menu Hierarchy**: Missing nested saving for `MenuCategory` -> `MenuItem`.

### D) Subscription & Slots Gaps
- **Slot Limits**: `SlotInventory` counts total spots but lacks an atomic decrement transaction when assigning a `SlotAssignment` locking the slot securely against race conditions.

## 2. Missing Engine Integrations
- **Dynamic Subtype Forms**: Currently just a schema dump. We need to convert templates into active `zod` validations dynamically based on category types.
- **CMS Row Scheduler**: `visibilitySchedule` exists in `CMSSection` but queries aren't filtering out expired/pending sections effectively natively yet.
- **City Override Engine**: The architecture implies that some campaigns overwrite cities, but there's a gap in `Page` rendering injecting this.
- **Vendor ROI Automation**: Analytics aggregation is mapped but missing the final loop to serve the dashboard.

## 3. Structural & Schema Mismatches
1. Duplicate index warnings across `Category`, `ListingBase`, `Vendor`, etc.
2. Inconsistent module types (CommonJS mixed rapidly with ESM).
3. Postman payload payloads vs existing `auth.validator` and `hotels.validator` mismatches.
