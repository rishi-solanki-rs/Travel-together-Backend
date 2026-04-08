# Alerting and SRE Safety Report

## Scope
- Added alert policy framework with threshold evaluation and notifier adapters.
- Added safety monitor cron to evaluate operational anomalies every 10 minutes.

## Policies Covered
- negative inventory
- slot mismatch
- payment mismatch
- reconciliation drift
- DLQ growth
- failed delete retries
- high homepage latency (metric-driven)
- booking failures
- duplicate checkout spikes
- memory pressure

## Integrations
- Slack webhook adapter
- generic webhook adapter
- PagerDuty Events API adapter
- incident payloads include correlation identifiers and context snapshots

## Reliability
- Cron failures emit critical alerts.
- Reconciliation drift and poison-message quarantine generate high-severity signals.
- Thresholds are env-configurable for safe rollout tuning.
