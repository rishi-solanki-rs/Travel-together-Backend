import {
  renewSubscriptionSchema,
  retrySubscriptionSchema,
  changePlanSchema,
} from '../../src/modules/subscriptions/subscriptions.validator.js';

describe('Phase 6 - subscriptions functionality', () => {
  test('renew schema accepts valid date range', () => {
    const parsed = renewSubscriptionSchema.parse({
      validFrom: '2030-01-01T00:00:00.000Z',
      validTo: '2030-02-01T00:00:00.000Z',
      amount: 1000,
    });
    expect(parsed.amount).toBe(1000);
  });

  test('change-plan schema validates objectId', () => {
    const parsed = changePlanSchema.parse({ planId: '507f191e810c19729de860ea' });
    expect(parsed.planId).toBe('507f191e810c19729de860ea');
    expect(retrySubscriptionSchema.parse({})).toEqual({});
  });
});
