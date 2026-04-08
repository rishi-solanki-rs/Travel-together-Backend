# PERFORMANCE_TEST_MATRIX_PHASE_4

## Test Files
- tests/performance/pages.batch-render.test.js
- tests/cms/visibility-query.test.js

## Required Matrix and Status
1. 12 section homepage cold render
- Covered: query-plan batching test validates <=3 unique listing query hashes for duplicate-heavy homepage setup.

2. Duplicate section filters
- Covered: identical filters yield identical fingerprint hash.

3. Mixed city override
- Covered: request city precedence and section/default fallbacks.

4. Scheduled section window
- Covered: CMS visibility query schedule clause tests.

5. Compact mode payload
- Covered: compact serializer shape assertions.

6. Detailed mode compatibility
- Covered: detailed serializer field retention assertions.

7. Subtype landing page
- Covered: subtypeKey -> subtypeId normalization test.

8. Mobile image fallback
- Covered: mobile-first variant preference test.

## Runtime Validation Summary
- `tests/cms/visibility-query.test.js`: passed
- `tests/performance/pages.batch-render.test.js`: passed
- Regression sweep with existing Phase 2 and Phase 3 suites: passed

## Target Mapping
- Fan-out reduction: implemented via fingerprint batching + shared hydration pool.
- Payload bloat reduction: compact mode opt-in implemented.
- Visibility correctness: explicit visibility query builder implemented and tested.
- Cache stability: SCAN invalidation and fragment/render cache strategies implemented.
