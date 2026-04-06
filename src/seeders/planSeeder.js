import SubscriptionPlan from '../shared/models/SubscriptionPlan.model.js';
import logger from '../utils/logger.js';

const plansData = [
  {
    name: 'Free', key: 'free', displayName: 'Free Plan', tagline: 'Get started on Together In India',
    color: '#6B7280', priority: 0, isDefault: true, order: 1,
    pricing: { monthly: 0, quarterly: 0, halfYearly: 0, annual: 0, currency: 'INR' },
    limits: { maxListings: 1, maxImages: 5, maxGalleryImages: 10, maxStaffAccounts: 1, homepageSlotsAllowed: 0, categorySlotsAllowed: 0, campaignParticipation: false, analyticsAccess: false, prioritySupport: false },
    features: [
      { key: 'listings', label: '1 Active Listing', value: 1 },
      { key: 'images', label: 'Up to 5 Images', value: 5 },
      { key: 'basic_profile', label: 'Basic Vendor Profile', value: true },
    ],
  },
  {
    name: 'Red', key: 'red', displayName: 'Red Plan', tagline: 'Essential visibility for growing businesses',
    color: '#EF4444', priority: 1, order: 2,
    pricing: { monthly: 1999, quarterly: 5499, halfYearly: 9999, annual: 17999, currency: 'INR' },
    limits: { maxListings: 3, maxImages: 15, maxGalleryImages: 30, maxStaffAccounts: 2, homepageSlotsAllowed: 0, categorySlotsAllowed: 1, campaignParticipation: true, analyticsAccess: false, prioritySupport: false },
    features: [
      { key: 'listings', label: 'Up to 3 Listings', value: 3, isHighlighted: true },
      { key: 'category_slot', label: '1 Category Featured Slot', value: 1, isHighlighted: true },
      { key: 'campaign', label: 'Campaign Participation', value: true },
      { key: 'priority', label: 'Priority in Search Results', value: true },
    ],
  },
  {
    name: 'Silver', key: 'silver', displayName: 'Silver Plan', tagline: 'Maximum exposure for established businesses',
    color: '#6B7280', priority: 2, order: 3, isFeatured: true,
    pricing: { monthly: 3999, quarterly: 10999, halfYearly: 19999, annual: 35999, currency: 'INR' },
    limits: { maxListings: 8, maxImages: 30, maxGalleryImages: 60, maxStaffAccounts: 4, homepageSlotsAllowed: 1, categorySlotsAllowed: 2, campaignParticipation: true, analyticsAccess: true, prioritySupport: false },
    features: [
      { key: 'listings', label: 'Up to 8 Listings', value: 8, isHighlighted: true },
      { key: 'homepage_slot', label: '1 Homepage Featured Slot', value: 1, isHighlighted: true },
      { key: 'category_slots', label: '2 Category Featured Slots', value: 2 },
      { key: 'analytics', label: 'Analytics Dashboard', value: true, isHighlighted: true },
      { key: 'campaign', label: 'Campaign Participation', value: true },
    ],
  },
  {
    name: 'Gold', key: 'gold', displayName: 'Gold Plan', tagline: 'The ultimate platform for market leaders',
    color: '#F59E0B', priority: 3, order: 4,
    pricing: { monthly: 7999, quarterly: 21999, halfYearly: 39999, annual: 71999, currency: 'INR' },
    limits: { maxListings: 20, maxImages: 60, maxGalleryImages: 120, maxStaffAccounts: 10, homepageSlotsAllowed: 3, categorySlotsAllowed: 5, campaignParticipation: true, analyticsAccess: true, prioritySupport: true },
    features: [
      { key: 'listings', label: 'Up to 20 Listings', value: 20, isHighlighted: true },
      { key: 'homepage_slots', label: '3 Homepage Featured Slots', value: 3, isHighlighted: true },
      { key: 'category_slots', label: '5 Category Featured Slots', value: 5, isHighlighted: true },
      { key: 'analytics', label: 'Advanced Analytics + Reports', value: true, isHighlighted: true },
      { key: 'priority_support', label: 'Priority Support', value: true, isHighlighted: true },
      { key: 'campaign', label: 'Campaign Priority Access', value: true },
    ],
  },
];

const run = async () => {
  logger.info('Seeding subscription plans...');

  for (const plan of plansData) {
    await SubscriptionPlan.findOneAndUpdate({ key: plan.key }, { ...plan, isActive: true }, { upsert: true, new: true });
  }

  logger.info(`✅ ${plansData.length} subscription plans seeded`);
};

export { run };
