# CROSS DOMAIN NEARBY RECOMMENDATION MATRIX

## Engine entrypoint
- Service: src/operations/discovery/nearby.service.js
- Primary method: findNearbyByCityAndArea({ cityId, areaId, domain, lat, lng, radius })
- Related method: getRelatedPlaces({ listingId })
- Block method: getSmartDiscoveryBlocks({ cityId, areaId, lat, lng })

## Domain to category map
| Requested Source Context | Recommended Domain Buckets | Backing Category Keys |
| --- | --- | --- |
| Hotel page | Eat & Drink, Shops/Fashion, Experiences | restaurants, shops, thingsToDo, tribes |
| Destination page | Street food, souvenirs, cafes, nearby markets | restaurants, shops |
| Temple/Monument/Beach/Activity | nearby eat & drink, saree/jewellery/souvenir/fashion, artisan stores | restaurants, shops, tribes |
| Shop page | nearby markets + cafes + attractions | shops, restaurants, thingsToDo |
| Market/Mall page | nearby food + fashion + experiences | restaurants, shops, thingsToDo |

## Recommendation strategies implemented
1. Nearby by city + area
- cityId + areaId scoped filtering.

2. Nearby by coordinates/radius
- Uses geospatial near query on listing geoLocation when lat/lng supplied.

3. Nearby by landmark
- nearbyLandmarks[] matching supported.

4. Nearby by same route/cluster
- areaCluster / vendor cluster contributes to recommendation scoring.

5. Nearby by same vendor cluster
- Shared vendorId contributes to ranking boost.

6. Cross-domain smart recommendations
- Different category gets intentional positive score (cross-domain expansion).
- Shared tags boost recommendation score.
- sponsored/popularChoice/superSaver labels influence score.

## API matrix
| Endpoint | Purpose | Consumer |
| --- | --- | --- |
| GET /api/v1/discovery/nearby | Nearby cards by city/area/domain/geo | User discovery UI |
| GET /api/v1/discovery/related/:listingId | People also explored style related places | Listing card/detail widgets |
| GET /api/v1/discovery/blocks | Ready-to-render grouped discovery sections | User home widgets |
| GET /api/v1/discovery/sidebar-filters | Dynamic filter metadata + presets | Sidebar filter UI |
| GET /api/v1/search/blended | Cross-domain blended search results | Global search UI |

## Coverage status by requested recommendation
| Requirement | Status | Notes |
| --- | --- | --- |
| Nearby eat & drink | Complete | Via nearby blocks + domain mapping |
| Nearby fashion stores | Complete | Via shops/fashion domain and vendorType |
| Nearby artisan shops | Complete | Via tribes/shops taxonomy and tags |
| Nearby markets | Complete | Via shops domain + tags/vendorType |
| Nearby street food | Complete | Via eatDrink preset tags |
| Nearby malls | Complete | Via shops vendorType taxonomy |
| Nearby cafes | Complete | Via eatDrink tags |
| Nearby souvenir shops | Complete | Via shops tags/vendorType |

## Residual dependencies
- Personalized recommendation model (behavioral history + CTR feedback loop) not yet integrated.
- Tourist route graph ingestion still pending for route-confidence weighting.
- Geo enrichment quality depends on listing coordinate/address completeness.
