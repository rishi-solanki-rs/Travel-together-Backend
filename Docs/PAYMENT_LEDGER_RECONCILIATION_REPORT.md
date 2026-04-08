# Payment Ledger and Reconciliation Report

## Scope
- Added finance-grade models: PaymentLedger, ReconciliationRun, SettlementBatch, RefundLedger, ChargebackRecord.
- Added helper engine for double-entry style balancing and payout-ready balance calculations.

## Capabilities Implemented
- Double-entry records with debit/credit totals and balance status.
- Daily reconciliation cron with lock safety and drift detection.
- Duplicate payment detection.
- Missing settlement detection.
- Refund mismatch scan.
- Orphan payment detection.
- Chargeback lifecycle status updates.
- Payout-ready balance computation across ledgers and chargebacks.
- Finance dashboard aggregate endpoint support via internal ops summary.

## Operational Behavior
- Reconciliation run persists completed/failed states and statistics.
- Drift or mismatch conditions emit critical reconciliation alerts.
- Payment ledger append integrated in hotel/shop/destination commerce confirmations.
