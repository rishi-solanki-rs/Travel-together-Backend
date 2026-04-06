import Category from '../shared/models/Category.model.js';
import SubType from '../shared/models/SubType.model.js';
import logger from '../utils/logger.js';

const categoriesData = [
  { name: 'Hotels', slug: 'hotels', key: 'hotels', icon: 'hotel', color: '#E8D5B7', order: 1, isFeatured: true },
  { name: 'Things To Do', slug: 'things-to-do', key: 'thingsToDo', icon: 'activity', color: '#B7D9E8', order: 2, isFeatured: true },
  { name: 'Restaurants', slug: 'restaurants', key: 'restaurants', icon: 'restaurant', color: '#FFD5B7', order: 3, isFeatured: true },
  { name: 'Shops', slug: 'shops', key: 'shops', icon: 'shopping-bag', color: '#D5FFB7', order: 4, isFeatured: true },
  { name: 'World Tribes', slug: 'world-tribes', key: 'tribes', icon: 'globe', color: '#E8B7D5', order: 5, isFeatured: true },
  { name: 'Kids World', slug: 'kids-world', key: 'kidsWorld', icon: 'smile', color: '#FFEEB7', order: 6, isFeatured: true },
  { name: 'Destinations', slug: 'destinations', key: 'destinations', icon: 'map-pin', color: '#C5E8B7', order: 7, isFeatured: true },
];

const subtypesData = [
  { name: 'Heritage Hotel', slug: 'heritage-hotel', key: 'heritage_hotel', categoryKey: 'hotels', order: 1 },
  { name: 'Resort', slug: 'resort', key: 'resort', categoryKey: 'hotels', order: 2 },
  { name: 'Boutique Stay', slug: 'boutique-stay', key: 'boutique_stay', categoryKey: 'hotels', order: 3 },
  { name: 'Homestay', slug: 'homestay', key: 'homestay', categoryKey: 'hotels', order: 4 },

  { name: 'Same Day Tour', slug: 'same-day-tour', key: 'same_day_tour', categoryKey: 'thingsToDo', order: 1 },
  { name: 'Customized Tour', slug: 'customized-tour', key: 'customized_tour', categoryKey: 'thingsToDo', order: 2 },
  { name: 'Fixed Departure', slug: 'fixed-departure', key: 'fixed_departure', categoryKey: 'thingsToDo', order: 3 },
  { name: 'Adventure Activity', slug: 'adventure-activity', key: 'adventure_activity', categoryKey: 'thingsToDo', order: 4 },

  { name: 'Fine Dining', slug: 'fine-dining', key: 'fine_dining', categoryKey: 'restaurants', order: 1 },
  { name: 'Cafe', slug: 'cafe', key: 'cafe', categoryKey: 'restaurants', order: 2 },
  { name: 'Street Food', slug: 'street-food', key: 'street_food', categoryKey: 'restaurants', order: 3 },
  { name: 'Multi Cuisine', slug: 'multi-cuisine', key: 'multi_cuisine', categoryKey: 'restaurants', order: 4 },

  { name: 'Handicraft Store', slug: 'handicraft-store', key: 'handicraft_store', categoryKey: 'shops', order: 1 },
  { name: 'Artisan Studio', slug: 'artisan-studio', key: 'artisan_studio', categoryKey: 'shops', order: 2 },
  { name: 'NGO Store', slug: 'ngo-store', key: 'ngo_store', categoryKey: 'shops', order: 3 },
  { name: 'Souvenir Shop', slug: 'souvenir-shop', key: 'souvenir_shop', categoryKey: 'shops', order: 4 },

  { name: 'Cultural Experience', slug: 'cultural-experience', key: 'cultural_experience', categoryKey: 'tribes', order: 1 },
  { name: 'Tribal Workshop', slug: 'tribal-workshop', key: 'tribal_workshop', categoryKey: 'tribes', order: 2 },
  { name: 'Local Stay', slug: 'local-stay', key: 'local_stay', categoryKey: 'tribes', order: 3 },
  { name: 'Festival Event', slug: 'festival-event', key: 'festival_event', categoryKey: 'tribes', order: 4 },

  { name: 'Kids Camp', slug: 'kids-camp', key: 'kids_camp', categoryKey: 'kidsWorld', order: 1 },
  { name: 'Educational Workshop', slug: 'educational-workshop', key: 'educational_workshop', categoryKey: 'kidsWorld', order: 2 },
  { name: 'Sports Activity', slug: 'sports-activity', key: 'sports_activity', categoryKey: 'kidsWorld', order: 3 },
  { name: 'Arts & Crafts', slug: 'arts-crafts', key: 'arts_crafts', categoryKey: 'kidsWorld', order: 4 },

  { name: 'Honeymoon Package', slug: 'honeymoon-package', key: 'honeymoon_package', categoryKey: 'destinations', order: 1 },
  { name: 'Family Tour', slug: 'family-tour', key: 'family_tour', categoryKey: 'destinations', order: 2 },
  { name: 'Luxury Package', slug: 'luxury-package', key: 'luxury_package', categoryKey: 'destinations', order: 3 },
  { name: 'Budget Package', slug: 'budget-package', key: 'budget_package', categoryKey: 'destinations', order: 4 },
];

const run = async () => {
  logger.info('Seeding categories and subtypes...');

  const categoryMap = {};
  for (const cat of categoriesData) {
    const saved = await Category.findOneAndUpdate({ key: cat.key }, { ...cat, isActive: true }, { upsert: true, new: true });
    categoryMap[cat.key] = saved._id;
  }

  for (const sub of subtypesData) {
    const categoryId = categoryMap[sub.categoryKey];
    if (!categoryId) continue;
    await SubType.findOneAndUpdate({ key: sub.key }, { ...sub, categoryId, isActive: true }, { upsert: true, new: true });
  }

  logger.info(`✅ Categories (${categoriesData.length}) and subtypes (${subtypesData.length}) seeded`);
};

export { run };
