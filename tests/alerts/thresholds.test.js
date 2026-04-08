import { evaluateThresholds } from '../../src/operations/alerts/alerting.service.js';

describe('Phase 7 alert thresholds', () => {
  test('5) alert threshold breach returns breached policies', () => {
    const breaches = evaluateThresholds(
      { negativeInventory: 2, memoryPressureMb: 300 },
      { negativeInventory: 1, memoryPressureMb: 512 }
    );

    expect(breaches).toEqual([{ key: 'negativeInventory', value: 2, threshold: 1 }]);
  });

  test('10) cron failure alert policy is breachable', () => {
    const breaches = evaluateThresholds(
      { bookingFailures: 3 },
      { bookingFailures: 1 }
    );

    expect(breaches[0]).toEqual({ key: 'bookingFailures', value: 3, threshold: 1 });
  });
});
