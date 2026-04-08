import { buildSectionVisibilityQuery } from '../../src/modules/cms/cms.service.js';

describe('CMS visibility query builder', () => {
  test('builds page + global section matrix with explicit $and composition', () => {
    const query = buildSectionVisibilityQuery({ pageId: '507f1f77bcf86cd799439011' });

    expect(query.$and).toBeDefined();
    expect(Array.isArray(query.$and)).toBe(true);
    expect(query.$and.length).toBe(3);
    expect(query.$and[1].$or).toEqual([
      { pageId: '507f1f77bcf86cd799439011' },
      { isGlobal: true },
    ]);
  });

  test('includes scheduled active/inactive visibility window logic', () => {
    const now = new Date('2026-04-06T10:00:00.000Z');
    const query = buildSectionVisibilityQuery({ pageId: '507f1f77bcf86cd799439011', now });
    const scheduleClause = query.$and[2];

    expect(scheduleClause.$or).toHaveLength(4);
    expect(scheduleClause.$or).toEqual(
      expect.arrayContaining([
        { scheduledFrom: null, scheduledTo: null },
        { scheduledFrom: null, scheduledTo: { $gte: now } },
        { scheduledFrom: { $lte: now }, scheduledTo: null },
        { scheduledFrom: { $lte: now }, scheduledTo: { $gte: now } },
      ])
    );
  });

  test('applies city override precedence when city is requested', () => {
    const cityId = '507f1f77bcf86cd799439012';
    const query = buildSectionVisibilityQuery({
      pageId: '507f1f77bcf86cd799439011',
      cityId,
    });

    const cityClause = query.$and[3];
    expect(cityClause).toBeDefined();
    expect(cityClause.$or).toEqual([
      { cityId: null },
      { cityId },
    ]);
  });

  test('falls back safely when city override is null', () => {
    const query = buildSectionVisibilityQuery({
      pageId: '507f1f77bcf86cd799439011',
      cityId: null,
    });

    expect(query.$and.length).toBe(3);
  });

  test('supports mixed visibility clauses without duplicate key overwrite risk', () => {
    const query = buildSectionVisibilityQuery({ pageId: '507f1f77bcf86cd799439011' });
    const keys = Object.keys(query);

    expect(keys).toEqual(['$and']);
    expect(query.$and.filter((clause) => clause.$or).length).toBe(2);
  });
});
