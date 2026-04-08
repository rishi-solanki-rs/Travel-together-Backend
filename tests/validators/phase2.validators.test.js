import { createInventorySchema, assignSlotSchema } from '../../src/modules/slots/slots.validator.js';
import { createSubscriptionSchema, activateSubscriptionSchema } from '../../src/modules/subscriptions/subscriptions.validator.js';
import { pageBodySchema } from '../../src/modules/pages/pages.validator.js';
import { cmsSectionBodySchema } from '../../src/modules/cms/cms.validator.js';
import { uploadSingleSchema } from '../../src/modules/uploads/uploads.validator.js';
import { createRoomSchema, setPricingSchema } from '../../src/modules/hotels/hotels.validator.js';
import { createItinerarySchema, addDepartureSchema } from '../../src/modules/thingsToDo/thingsToDo.validator.js';
import { restaurantProfileBodySchema, menuItemBodySchema } from '../../src/modules/restaurants/restaurants.validator.js';
import { catalogBodySchema, stockUpdateSchema } from '../../src/modules/shops/shops.validator.js';
import { createExperienceSchema, addScheduleSchema } from '../../src/modules/tribes/tribes.validator.js';
import { createActivitySchema, addSessionSchema } from '../../src/modules/kidsWorld/kidsWorld.validator.js';
import { createPackageSchema, addDepartureDateSchema } from '../../src/modules/destinations/destinations.validator.js';
import { reportsQuerySchema } from '../../src/modules/reports/reports.validator.js';
import { monetizationQuerySchema } from '../../src/modules/monetization/monetization.validator.js';

describe('Phase 2 validator rollout negative cases', () => {
  test('slots rejects invalid slot scope and bad assignment ids', () => {
    const inventoryResult = createInventorySchema.safeParse({
      slotType: 'category_top',
      planTier: 'gold',
      categoryId: '507f1f77bcf86cd799439011',
      totalSlots: 2,
      priority: 1,
    });
    const assignmentResult = assignSlotSchema.safeParse({
      vendorId: 'bad-id',
      subscriptionId: '507f1f77bcf86cd799439011',
      inventoryId: '507f1f77bcf86cd799439012',
    });

    expect(inventoryResult.success).toBe(false);
    expect(assignmentResult.success).toBe(false);
  });

  test('subscriptions rejects unsupported billing cycle and invalid activation dates', () => {
    const createResult = createSubscriptionSchema.safeParse({
      planId: '507f1f77bcf86cd799439011',
      billingCycle: 'weekly',
    });
    const activateResult = activateSubscriptionSchema.safeParse({
      reference: 'TXN-123',
      gateway: 'razorpay',
      amount: 100,
      startDate: '2026-05-20',
      endDate: '2026-05-01',
    });

    expect(createResult.success).toBe(false);
    expect(activateResult.success).toBe(false);
  });

  test('pages rejects invalid page type', () => {
    const result = pageBodySchema.safeParse({
      title: 'Home',
      slug: 'home',
      type: 'legacy',
    });

    expect(result.success).toBe(false);
  });

  test('cms rejects invalid section type and schedule range', () => {
    const result = cmsSectionBodySchema.safeParse({
      title: 'Hero',
      identifier: 'hero-main',
      type: 'carousel_top',
      scheduledFrom: '2026-06-10',
      scheduledTo: '2026-06-01',
    });

    expect(result.success).toBe(false);
  });

  test('uploads rejects unsupported upload role', () => {
    const result = uploadSingleSchema.safeParse({
      context: 'cms',
      role: 'avatar',
    });

    expect(result.success).toBe(false);
  });

  test('hotels rejects negative pricing and invalid room availability ranges', () => {
    const roomResult = createRoomSchema.safeParse({
      name: 'Suite A',
      roomType: 'suite',
      basePrice: -1,
      maxOccupancy: 2,
    });
    const pricingResult = setPricingSchema.safeParse({
      entries: [{ startDate: '2026-08-10', endDate: '2026-08-01', price: 1000 }],
    });

    expect(roomResult.success).toBe(false);
    expect(pricingResult.success).toBe(false);
  });

  test('thingsToDo rejects invalid itinerary type and departure capacity underflow', () => {
    const itineraryResult = createItinerarySchema.safeParse({
      title: 'Monsoon trail',
      tourType: 'adventure',
    });
    const departureResult = addDepartureSchema.safeParse({
      departureDate: '2026-09-01',
      returnDate: '2026-09-03',
      totalCapacity: 5,
      availableCapacity: 8,
      adultPrice: 100,
    });

    expect(itineraryResult.success).toBe(false);
    expect(departureResult.success).toBe(false);
  });

  test('restaurants rejects invalid listing status and discounted price overflow', () => {
    const profileResult = restaurantProfileBodySchema.safeParse({
      title: 'Spice Route',
      status: 'review',
    });
    const menuItemResult = menuItemBodySchema.safeParse({
      name: 'Paneer Tikka',
      price: 300,
      discountedPrice: 350,
    });

    expect(profileResult.success).toBe(false);
    expect(menuItemResult.success).toBe(false);
  });

  test('shops rejects invalid listing status and negative stock update', () => {
    const catalogResult = catalogBodySchema.safeParse({
      title: 'Handmade',
      status: 'visible',
    });
    const stockResult = stockUpdateSchema.safeParse({
      stock: -2,
    });

    expect(catalogResult.success).toBe(false);
    expect(stockResult.success).toBe(false);
  });

  test('tribes rejects participant bounds and schedule seat underflow', () => {
    const experienceResult = createExperienceSchema.safeParse({
      title: 'Story Circle',
      experienceType: 'storytelling',
      minParticipants: 10,
      maxParticipants: 4,
      basePrice: 500,
    });
    const scheduleResult = addScheduleSchema.safeParse({
      eventDate: '2026-07-12',
      startTime: '16:00',
      endTime: '15:00',
      seatsTotal: 10,
      seatsAvailable: 11,
    });

    expect(experienceResult.success).toBe(false);
    expect(scheduleResult.success).toBe(false);
  });

  test('kidsWorld rejects age/group bounds and invalid session timings', () => {
    const activityResult = createActivitySchema.safeParse({
      title: 'Science Club',
      activityType: 'science',
      minAge: 12,
      maxAge: 8,
    });
    const sessionResult = addSessionSchema.safeParse({
      sessionDate: '2026-10-10',
      startTime: '11:00',
      endTime: '10:00',
      seatsTotal: 15,
      seatsAvailable: 16,
    });

    expect(activityResult.success).toBe(false);
    expect(sessionResult.success).toBe(false);
  });

  test('destinations rejects unsupported transport type and invalid departure capacity', () => {
    const packageResult = createPackageSchema.safeParse({
      title: 'Hill Circuit',
      transportType: 'boat',
    });
    const departureResult = addDepartureDateSchema.safeParse({
      departureDate: '2026-11-15',
      returnDate: '2026-11-10',
      adultPrice: 2000,
      totalCapacity: 20,
      availableCapacity: 21,
    });

    expect(packageResult.success).toBe(false);
    expect(departureResult.success).toBe(false);
  });

  test('reports rejects reversed date range query', () => {
    const result = reportsQuerySchema.safeParse({
      startDate: '2026-12-31',
      endDate: '2026-01-01',
    });

    expect(result.success).toBe(false);
  });

  test('monetization rejects invalid vendor id in query', () => {
    const result = monetizationQuerySchema.safeParse({
      vendorId: '123',
    });

    expect(result.success).toBe(false);
  });
});
