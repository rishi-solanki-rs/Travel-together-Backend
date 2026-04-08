import PaymentLedger from '../../shared/models/PaymentLedger.model.js';
import ReconciliationRun from '../../shared/models/ReconciliationRun.model.js';
import SettlementBatch from '../../shared/models/SettlementBatch.model.js';
import RefundLedger from '../../shared/models/RefundLedger.model.js';
import ChargebackRecord from '../../shared/models/ChargebackRecord.model.js';
import { getCorrelationId } from '../../shared/context/requestContext.js';
import { emitAlert } from '../alerts/alerting.service.js';
import { incrementCounter, setGauge } from '../metrics/metrics.service.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../audit/audit.service.js';
import { canWriteFinanceLedger } from '../security/accessGovernance.service.js';

const computeEntryTotals = (entries = []) => entries.reduce((acc, entry) => {
  if (entry.direction === 'debit') acc.debits += Number(entry.amount || 0);
  if (entry.direction === 'credit') acc.credits += Number(entry.amount || 0);
  return acc;
}, { debits: 0, credits: 0 });

const isBalanced = ({ debits, credits }) => Math.abs(Number(debits || 0) - Number(credits || 0)) < 0.0001;

const detectDuplicatePayments = (ledgers = []) => {
  const seen = new Set();
  const duplicates = [];
  for (const ledger of ledgers) {
    if (seen.has(ledger.paymentReference)) duplicates.push(ledger);
    else seen.add(ledger.paymentReference);
  }
  return duplicates;
};

const detectMissingSettlements = (ledgers = [], settlements = []) => {
  const settledRefs = new Set(settlements.map((batch) => batch.batchRef));
  return ledgers.filter((ledger) => !settledRefs.has(ledger.paymentReference));
};

const detectRefundMismatches = (refunds = []) => refunds.filter((refund) => Number(refund.amountRequested || 0) !== Number(refund.amountProcessed || 0));

const detectOrphanPayments = (ledgers = []) => ledgers.filter((ledger) => !ledger.sourceType || !ledger.sourceId);

const calculatePayoutReadyBalances = (ledgers = [], chargebacks = []) => {
  const bySource = new Map();
  const chargebackMap = new Map();

  for (const cb of chargebacks) {
    const key = `${cb.sourceType}:${String(cb.sourceId)}`;
    chargebackMap.set(key, (chargebackMap.get(key) || 0) + Number(cb.amount || 0));
  }

  for (const ledger of ledgers) {
    const totals = computeEntryTotals(ledger.entries || []);
    const net = totals.credits - totals.debits;
    const key = `${ledger.sourceType}:${String(ledger.sourceId)}`;
    bySource.set(key, (bySource.get(key) || 0) + net);
  }

  return Array.from(bySource.entries()).map(([key, gross]) => ({
    key,
    gross,
    chargeback: chargebackMap.get(key) || 0,
    payoutReady: Number((gross - (chargebackMap.get(key) || 0)).toFixed(2)),
  }));
};

const appendPaymentLedger = async ({ sourceType, sourceId, paymentReference, entries = [], metadata = {}, securityContext = { source: 'service', user: null } }) => {
  const writeAllowed = await canWriteFinanceLedger({ user: securityContext?.user || null, source: securityContext?.source || 'service' });
  if (!writeAllowed) {
    throw new Error('Finance ledger write denied by authorization policy');
  }

  const totals = computeEntryTotals(entries);
  const status = isBalanced(totals) ? 'balanced' : 'unbalanced';

  const ledger = await PaymentLedger.create({
    correlationId: getCorrelationId() || 'missing-correlation-id',
    sourceType,
    sourceId,
    paymentReference,
    entries,
    totalDebits: totals.debits,
    totalCredits: totals.credits,
    status,
    metadata,
  });

  await recordFinancialLedgerEvent({
    domain: 'bookings',
    entityType: sourceType,
    entityId: sourceId,
    eventType: 'payment-ledger-entry',
    amount: totals.credits,
    metadata: { paymentReference, status },
  });

  return ledger;
};

const markChargebackStatus = async ({ disputeReference, status }) => {
  const cb = await ChargebackRecord.findOneAndUpdate({ disputeReference }, { status, resolvedAt: status === 'reversed' ? new Date() : null }, { new: true });
  if (!cb) return null;
  await recordAuditEvent({
    eventType: 'finance.chargeback.lifecycle',
    module: 'finance',
    entityType: 'ChargebackRecord',
    entityId: cb._id,
    action: 'status-update',
    afterSnapshot: { disputeReference, status },
  });
  return cb;
};

const runDailyReconciliation = async () => {
  const correlationId = getCorrelationId() || `recon-${Date.now()}`;
  const run = await ReconciliationRun.create({ runDate: new Date(), correlationId, status: 'running' });

  try {
    const [ledgers, settlements, refunds, chargebacks] = await Promise.all([
      PaymentLedger.find({}).lean(),
      SettlementBatch.find({ status: 'processed' }).lean(),
      RefundLedger.find({}).lean(),
      ChargebackRecord.find({}).lean(),
    ]);

    const duplicatePayments = detectDuplicatePayments(ledgers);
    const missingSettlements = detectMissingSettlements(ledgers, settlements);
    const refundMismatches = detectRefundMismatches(refunds);
    const orphanPayments = detectOrphanPayments(ledgers);

    const driftAmount = refundMismatches.reduce((acc, mismatch) => acc + (Number(mismatch.amountRequested || 0) - Number(mismatch.amountProcessed || 0)), 0);

    run.status = 'completed';
    run.stats = {
      duplicatePayments: duplicatePayments.length,
      missingSettlements: missingSettlements.length,
      refundMismatches: refundMismatches.length,
      orphanPayments: orphanPayments.length,
      driftAmount,
    };
    await run.save();

    incrementCounter('tii_reconciliation_runs_total', 1, { status: 'completed' });
    setGauge('tii_reconciliation_drift_amount', driftAmount);

    if (duplicatePayments.length || missingSettlements.length || refundMismatches.length || orphanPayments.length || Math.abs(driftAmount) > 0) {
      await emitAlert({
        policy: 'reconciliation-drift',
        value: Math.abs(driftAmount),
        threshold: 1,
        summary: `Reconciliation drift detected: duplicates=${duplicatePayments.length}, missingSettlements=${missingSettlements.length}, refundMismatches=${refundMismatches.length}, orphanPayments=${orphanPayments.length}`,
        severity: 'critical',
        context: { correlationId, runId: run._id },
      });
    }

    await recordAuditEvent({
      eventType: 'finance.reconciliation.run',
      module: 'finance',
      entityType: 'ReconciliationRun',
      entityId: run._id,
      action: 'completed',
      metadata: run.stats,
      context: { correlationId, source: 'cron', module: 'finance' },
    });

    const balances = calculatePayoutReadyBalances(ledgers, chargebacks);
    return { run, balances, duplicatePayments, missingSettlements, refundMismatches, orphanPayments };
  } catch (error) {
    run.status = 'failed';
    run.notes = error?.message || 'unknown error';
    await run.save();
    incrementCounter('tii_reconciliation_runs_total', 1, { status: 'failed' });

    await emitAlert({
      policy: 'reconciliation-cron-failure',
      value: 1,
      threshold: 1,
      summary: `Reconciliation cron failed: ${error?.message || 'unknown error'}`,
      severity: 'critical',
      context: { correlationId, runId: run._id },
    });

    throw error;
  }
};

const getFinanceDashboard = async () => {
  const [latestRun, ledgerCount, settlementPending, refundMismatchCount, chargebackOpen] = await Promise.all([
    ReconciliationRun.findOne({}).sort({ createdAt: -1 }).lean(),
    PaymentLedger.countDocuments({}),
    SettlementBatch.countDocuments({ status: 'pending' }),
    RefundLedger.countDocuments({ status: 'mismatch' }),
    ChargebackRecord.countDocuments({ status: { $in: ['opened', 'under_review'] } }),
  ]);

  return {
    latestRun,
    ledgerCount,
    settlementPending,
    refundMismatchCount,
    chargebackOpen,
  };
};

export {
  computeEntryTotals,
  isBalanced,
  detectDuplicatePayments,
  detectMissingSettlements,
  detectRefundMismatches,
  detectOrphanPayments,
  calculatePayoutReadyBalances,
  appendPaymentLedger,
  markChargebackStatus,
  runDailyReconciliation,
  getFinanceDashboard,
};
