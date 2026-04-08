import {
  calculateAgeYears,
  enforceAgeGroup,
  computeWaitlistPromotion,
} from '../../src/modules/kidsWorld/kidsWorld.commerce.service.js';

describe('Phase 6 kids booking engine primitives', () => {
  test('6) age calculation uses birthdate and current date', () => {
    const age = calculateAgeYears('2018-06-15T00:00:00.000Z', new Date('2026-06-14T00:00:00.000Z'));
    expect(age).toBe(7);
  });

  test('7) age group guard validates bounds', () => {
    expect(enforceAgeGroup({ childAge: 8, minAge: 5, maxAge: 10 })).toBe(true);
    expect(enforceAgeGroup({ childAge: 4, minAge: 5, maxAge: 10 })).toBe(false);
  });

  test('8) waitlist promotion never exceeds available seats', () => {
    expect(computeWaitlistPromotion({ seatsAvailable: 3, waitlistCount: 10 })).toBe(3);
    expect(computeWaitlistPromotion({ seatsAvailable: 0, waitlistCount: 2 })).toBe(0);
  });
});
