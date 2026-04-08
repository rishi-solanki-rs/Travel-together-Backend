import {
  enforceSameDayBookingCutoff,
  getTourAnalyticsCounters,
} from '../../src/modules/thingsToDo/thingsToDo.commerce.service.js';

describe('Phase 6 tour reservation engine primitives', () => {
  test('4) same-day booking cutoff blocks late reservation', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const departure = new Date('2026-06-01T11:00:00.000Z');
    const allowed = enforceSameDayBookingCutoff({ departureDate: departure, cutoffHours: 2, now });
    expect(allowed).toBe(false);
  });

  test('5) reservation analytics counters aggregate status and seats', () => {
    const counters = getTourAnalyticsCounters([
      { status: 'confirmed', seatsReserved: 3 },
      { status: 'cancelled', seatsReserved: 1 },
      { status: 'hold', seatsReserved: 2 },
    ]);

    expect(counters).toEqual({ total: 3, confirmed: 1, cancelled: 1, seats: 6 });
  });
});
