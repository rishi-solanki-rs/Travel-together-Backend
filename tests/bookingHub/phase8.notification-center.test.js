import { NOTIFICATION_TYPES } from '../../src/shared/constants/index.js';

describe('Phase 8 - notification center', () => {
  test('contains required notification types', () => {
    expect(NOTIFICATION_TYPES.BOOKING).toBe('booking');
    expect(NOTIFICATION_TYPES.PAYMENT).toBe('payment');
    expect(NOTIFICATION_TYPES.REFUND).toBe('refund');
    expect(NOTIFICATION_TYPES.SUBSCRIPTION).toBe('subscription');
    expect(NOTIFICATION_TYPES.PAYOUT).toBe('payout');
    expect(NOTIFICATION_TYPES.ADMIN_ALERT).toBe('admin_alert');
    expect(NOTIFICATION_TYPES.SLOT_EXPIRING).toBe('slot_expiring');
  });
});
