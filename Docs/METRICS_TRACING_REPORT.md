# Metrics and Tracing Report

## Scope
- Added request correlation ID middleware and async request context propagation.
- Added Prometheus-friendly metrics endpoint at /internal/metrics.

## Instrumentation Coverage
- Request latency and request/response counters.
- Mongo query timing hooks (global Mongoose plugin).
- Redis operation timing and cache hit counters.
- Cloudinary operation timing and upload throughput bytes.
- Queue enqueue/process/failure timing metrics.
- Cron duration/success/failure metrics.
- Slot assignment contention metrics.
- Booking funnel and payment success counters in commerce flows.

## Endpoints
- /internal/metrics: Prometheus text format.
- /internal/ops/summary: finance, DLQ, and metric snapshot summary.

## Tracing
- Correlation ID propagation via x-correlation-id header across middleware and request context.
- Transaction utility consumes correlation ID automatically when available.
