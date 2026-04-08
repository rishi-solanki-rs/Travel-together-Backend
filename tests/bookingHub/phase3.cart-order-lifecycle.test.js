import { isValidBookingTransition } from '../../src/modules/bookingHub/bookingHub.state.js';

describe('Phase 3 - cart/order lifecycle', () => {
  test('supports delivered -> return_requested -> returned', () => {
    expect(isValidBookingTransition('delivered', 'return_requested')).toBe(true);
    expect(isValidBookingTransition('return_requested', 'returned')).toBe(true);
  });

  test('rejects invalid reverse transition', () => {
    expect(isValidBookingTransition('returned', 'shipped')).toBe(false);
  });
});
