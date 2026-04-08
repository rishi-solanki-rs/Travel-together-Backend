import {
  detectDuplicatePayments,
  detectRefundMismatches,
  calculatePayoutReadyBalances,
  computeEntryTotals,
  isBalanced,
} from '../../src/operations/finance/reconciliation.service.js';

describe('Phase 7 reconciliation engine', () => {
  test('1) duplicate payment replay detection finds duplicated references', () => {
    const duplicates = detectDuplicatePayments([
      { paymentReference: 'pay-1' },
      { paymentReference: 'pay-2' },
      { paymentReference: 'pay-1' },
    ]);
    expect(duplicates).toHaveLength(1);
  });

  test('2) refund mismatch detection flags non-equal request/processed amounts', () => {
    const mismatches = detectRefundMismatches([
      { amountRequested: 1000, amountProcessed: 1000 },
      { amountRequested: 500, amountProcessed: 450 },
    ]);
    expect(mismatches).toHaveLength(1);
  });

  test('3) chargeback reversal effect reflects in payout-ready balances', () => {
    const balances = calculatePayoutReadyBalances(
      [{ sourceType: 'hotel', sourceId: 'b1', entries: [{ direction: 'credit', amount: 1000 }, { direction: 'debit', amount: 0 }] }],
      [{ sourceType: 'hotel', sourceId: 'b1', amount: 200, status: 'opened' }]
    );

    expect(balances[0].payoutReady).toBe(800);
  });

  test('8) payout balance correctness keeps debits/credits balanced', () => {
    const totals = computeEntryTotals([
      { direction: 'debit', amount: 1200 },
      { direction: 'credit', amount: 1200 },
    ]);
    expect(isBalanced(totals)).toBe(true);
  });

  test('9) finance reconciliation drift can be derived from mismatched refunds', () => {
    const mismatches = detectRefundMismatches([
      { amountRequested: 1000, amountProcessed: 900 },
      { amountRequested: 500, amountProcessed: 400 },
    ]);

    const drift = mismatches.reduce((acc, row) => acc + (row.amountRequested - row.amountProcessed), 0);
    expect(drift).toBe(200);
  });
});
