import {
  sameUtcDate,
  computeDepartureSeatStatus,
  computeReturnDate,
  computeMilestoneSummary,
} from '../../src/modules/destinations/destinations.commerce.service.js';

describe('Phase 6 destination package commerce primitives', () => {
  test('13) utc date matcher ignores time component', () => {
    const match = sameUtcDate('2026-07-01T00:00:00.000Z', '2026-07-01T18:30:00.000Z');
    expect(match).toBe(true);
  });

  test('14) seat status transitions open-limited-full', () => {
    expect(computeDepartureSeatStatus(8)).toBe('open');
    expect(computeDepartureSeatStatus(4)).toBe('limited');
    expect(computeDepartureSeatStatus(0)).toBe('full');
  });

  test('15) return date derives from departure and duration', () => {
    const returnDate = computeReturnDate({ departureDate: '2026-07-01T00:00:00.000Z', durationDays: 5 });
    expect(returnDate.toISOString()).toBe('2026-07-06T00:00:00.000Z');
  });

  test('16) milestone summary computes paid and pending values', () => {
    const summary = computeMilestoneSummary([
      { status: 'paid', amount: 10000 },
      { status: 'pending', amount: 5000 },
      { status: 'paid', amount: 2500 },
    ]);

    expect(summary).toEqual({ total: 3, paid: 2, amountPaid: 12500, amountPending: 5000 });
  });
});
