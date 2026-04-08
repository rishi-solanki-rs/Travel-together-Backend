import { resolveVerificationStatus } from '../../src/modules/bookingHub/bookingHub.service.js';

describe('Phase 2 - payment lifecycle', () => {
  test('processing is default for initiated txn without override', () => {
    expect(resolveVerificationStatus(undefined, 'initiated')).toBe('processing');
  });

  test('explicit override has priority', () => {
    expect(resolveVerificationStatus('captured', 'initiated')).toBe('captured');
  });
});
