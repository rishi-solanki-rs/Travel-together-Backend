import { isValidBookingTransition } from '../../src/modules/bookingHub/bookingHub.state.js';

describe('Phase 4 - admin booking state machine', () => {
  test('allows hold -> confirmed -> checked_in', () => {
    expect(isValidBookingTransition('hold', 'confirmed')).toBe(true);
    expect(isValidBookingTransition('confirmed', 'checked_in')).toBe(true);
  });

  test('blocks terminal state transitions', () => {
    expect(isValidBookingTransition('cancelled', 'confirmed')).toBe(false);
  });
});
