import {
  isValidTransition,
  computeLeadScore,
  getLeadAgingBucket,
  summarizeLifecycleAnalytics,
} from '../../src/modules/inquiries/inquiryLifecycle.service.js';

describe('Inquiry CRM lifecycle', () => {
  test('allows lifecycle-safe transition', () => {
    expect(isValidTransition('new', 'contacted')).toBe(true);
  });

  test('blocks invalid terminal transition', () => {
    expect(isValidTransition('converted', 'followup_pending')).toBe(false);
  });

  test('lead score grows with high-intent signals', () => {
    const score = computeLeadScore({
      inquiry: { leadScore: 40, tags: ['wedding'] },
      status: 'visit_scheduled',
      tags: ['hot_lead'],
      seasonalInterest: 'festival',
      nextFollowupAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    expect(score).toBeGreaterThan(70);
  });

  test('aging bucket maps long-running leads', () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(getLeadAgingBucket(oldDate)).toBe('7d+');
  });

  test('summary aggregates conversion and overdue fields', () => {
    const rows = [
      {
        status: 'converted',
        leadScore: 90,
        nextFollowupAt: new Date(Date.now() - 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        followupNotes: [{ at: new Date(Date.now() - 60 * 60 * 1000) }],
        cityId: { name: 'Jaipur' },
        areaId: { name: 'Old City Loop' },
        vendorId: { businessName: 'Vendor One' },
        tags: ['collection:wedding'],
        seasonalInterest: 'festival',
        domain: 'shops',
      },
      {
        status: 'callback_requested',
        leadScore: 60,
        nextFollowupAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
        followupNotes: [],
        cityId: { name: 'Jaipur' },
        areaId: { name: 'Bapu Bazaar' },
        vendorId: { businessName: 'Vendor Two' },
        tags: [],
        seasonalInterest: '',
        domain: 'restaurants',
        lostReason: 'price_sensitive',
      },
    ];

    const summary = summarizeLifecycleAnalytics(rows);
    expect(summary.totalLeads).toBe(2);
    expect(summary.conversionRate).toBe(50);
    expect(summary.callbackOverdue).toBe(1);
    expect(summary.inquiryConversionByCity[0].city).toBe('Jaipur');
  });
});
