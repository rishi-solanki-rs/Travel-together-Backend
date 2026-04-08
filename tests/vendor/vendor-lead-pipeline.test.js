import { buildRoleScopedFilter } from '../../src/modules/inquiries/inquiryLifecycle.service.js';

describe('Vendor lead pipeline scoping', () => {
  test('vendor admin is scoped to own vendor', () => {
    const filter = buildRoleScopedFilter(
      { role: 'vendorAdmin', vendorId: 'v-1', id: 'u-1' },
      { status: 'new', cityId: 'c-1' }
    );

    expect(filter.vendorId).toBe('v-1');
    expect(filter.status).toBe('new');
    expect(filter.cityId).toBe('c-1');
  });

  test('vendor staff includes assignment guard', () => {
    const filter = buildRoleScopedFilter(
      { role: 'vendorStaff', vendorId: 'v-2', id: 'u-2' },
      {}
    );

    expect(filter.vendorId).toBe('v-2');
    expect(Array.isArray(filter.$or)).toBe(true);
  });

  test('admin can query cross-vendor with explicit filter', () => {
    const filter = buildRoleScopedFilter(
      { role: 'superAdmin', id: 'a-1' },
      { vendorId: 'v-3' }
    );

    expect(filter.vendorId).toBe('v-3');
  });
});
