import { nearbyQuerySchema, relatedParamsSchema, sidebarQuerySchema } from '../../src/modules/discovery/discovery.validator.js';

describe('Discovery validator coverage', () => {
  test('1) nearby accepts minimum valid payload', () => {
    const result = nearbyQuerySchema.safeParse({ domain: 'nearby', radius: 5, limit: 10 });
    expect(result.success).toBe(true);
  });

  test('2) nearby rejects radius below minimum', () => {
    const result = nearbyQuerySchema.safeParse({ radius: 0 });
    expect(result.success).toBe(false);
  });

  test('3) nearby rejects radius above maximum', () => {
    const result = nearbyQuerySchema.safeParse({ radius: 80 });
    expect(result.success).toBe(false);
  });

  test('4) nearby rejects limit above maximum', () => {
    const result = nearbyQuerySchema.safeParse({ limit: 1000 });
    expect(result.success).toBe(false);
  });

  test('5) nearby parses lat/lng numbers', () => {
    const result = nearbyQuerySchema.safeParse({ lat: '28.61', lng: '77.20' });
    expect(result.success).toBe(true);
    expect(result.data.lat).toBeCloseTo(28.61, 2);
  });

  test('6) related params require valid object id', () => {
    const result = relatedParamsSchema.safeParse({ listingId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  test('7) related params reject malformed id', () => {
    const result = relatedParamsSchema.safeParse({ listingId: 'bad-id' });
    expect(result.success).toBe(false);
  });

  test('8) sidebar accepts eatDrink domain', () => {
    const result = sidebarQuerySchema.safeParse({ domain: 'eatDrink' });
    expect(result.success).toBe(true);
  });

  test('9) sidebar accepts fashion domain', () => {
    const result = sidebarQuerySchema.safeParse({ domain: 'fashion' });
    expect(result.success).toBe(true);
  });

  test('10) sidebar rejects unsupported domain', () => {
    const result = sidebarQuerySchema.safeParse({ domain: 'temples' });
    expect(result.success).toBe(false);
  });
});
