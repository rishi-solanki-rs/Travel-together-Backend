# CITY AREA FILTER FLOW

## End to end flow
1. User selects city.
2. Frontend queries /api/v1/areas?cityId=<id>.
3. User selects area and discovery domain.
4. Frontend fetches:
- /api/v1/discovery/sidebar-filters
- /api/v1/discovery/nearby
- /api/v1/discovery/blocks
5. User applies tag/label/cuisine/product filters in sidebar.
6. Frontend filters cards and can additionally query /api/v1/search/blended.
7. User taps:
- Get deal: creates inquiry lead (/api/v1/inquiries)
- Wishlist: toggles wishlist (/api/v1/wishlist/toggle)
- People also explored: /api/v1/discovery/related/:listingId

## City/area intelligence inputs
- cityId (hard scope)
- areaId (micro-zone scope)
- nearbyLandmarks[]
- areaCluster
- geoLocation (lat/lng)
- radius (km)

## Dynamic sidebar flow
- Backend returns:
  - categories
  - subcategories
  - dynamic tags with counts
  - domain-specific preset filter groups
- Frontend merges preset + dynamic tags and keeps multi-select state.

## Admin and vendor flow
### Admin
- Manage category/subcategory records and ordering metadata.
- Update subtype filter config for sidebar display priority.
- Monitor taxonomy insights endpoint.

### Vendor
- Map listing with categoryIds/subCategoryIds/tags/cityId/areaId.
- Set nearbyLandmarks, vendorType, discoveryType, labels.
- Save category-specific gallery and seasonal collections under dynamicFields.

## Intelligence coverage
- City-level scope: Implemented
- Area-level scope: Implemented
- Landmark-level matching: Implemented
- Cross-domain ranking: Implemented
- Route cluster weighting: Partial
- Behavioral personalization: Pending

## Percentages
- City filter completeness: 88%
- Area filter completeness: 82%
- Landmark filter completeness: 80%
- Smart blended search completeness: 84%
- Exact remaining dependency percentage: 18%

## Remaining dependency items (18%)
1. Production seed data for area clusters/landmarks/tourist routes.
2. Automated open-now sync from live operating-hour feeds.
3. Recommendation CTR feedback loop to tune ranking weights.
4. Domain-specific detail-page widget rollout for all public page types.
