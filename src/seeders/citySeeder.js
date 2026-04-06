import City from '../shared/models/City.model.js';
import logger from '../utils/logger.js';

const citiesData = [
  { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan', isMetroCity: false, isFeatured: true, order: 1, geoLocation: { coordinates: [75.7873, 26.9124] }, popularFor: ['Heritage', 'Palaces', 'Shopping'], bestTimeToVisit: 'October to March' },
  { name: 'Delhi', slug: 'delhi', state: 'Delhi', isMetroCity: true, isFeatured: true, order: 2, geoLocation: { coordinates: [77.1025, 28.7041] }, popularFor: ['History', 'Food', 'Culture'] },
  { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', isMetroCity: true, isFeatured: true, order: 3, geoLocation: { coordinates: [72.8777, 19.0760] }, popularFor: ['Bollywood', 'Beaches', 'Nightlife'] },
  { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', isMetroCity: true, isFeatured: true, order: 4, geoLocation: { coordinates: [77.5946, 12.9716] }, popularFor: ['Tech', 'Gardens', 'Nightlife'] },
  { name: 'Goa', slug: 'goa', state: 'Goa', isMetroCity: false, isFeatured: true, order: 5, geoLocation: { coordinates: [74.1240, 15.2993] }, popularFor: ['Beaches', 'Nightlife', 'Water Sports'], bestTimeToVisit: 'November to February' },
  { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan', isMetroCity: false, isFeatured: true, order: 6, geoLocation: { coordinates: [73.6833, 24.5854] }, popularFor: ['Lakes', 'Palaces', 'Romance'] },
  { name: 'Agra', slug: 'agra', state: 'Uttar Pradesh', isMetroCity: false, isFeatured: true, order: 7, geoLocation: { coordinates: [78.0080, 27.1767] }, popularFor: ['Taj Mahal', 'Mughal Heritage'] },
  { name: 'Kerala', slug: 'kerala', state: 'Kerala', isMetroCity: false, isFeatured: true, order: 8, geoLocation: { coordinates: [76.2711, 10.8505] }, popularFor: ['Backwaters', 'Ayurveda', 'Nature'] },
  { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', isMetroCity: false, isFeatured: true, order: 9, geoLocation: { coordinates: [83.0043, 25.3176] }, popularFor: ['Ghats', 'Spirituality', 'Culture'] },
  { name: 'Shimla', slug: 'shimla', state: 'Himachal Pradesh', isMetroCity: false, isFeatured: true, order: 10, geoLocation: { coordinates: [77.1734, 31.1048] }, popularFor: ['Hill Station', 'Snow', 'Honeymoon'] },
  { name: 'Darjeeling', slug: 'darjeeling', state: 'West Bengal', isMetroCity: false, isFeatured: false, order: 11, geoLocation: { coordinates: [88.2663, 27.0360] }, popularFor: ['Tea Gardens', 'Mountains', 'Toy Train'] },
  { name: 'Rishikesh', slug: 'rishikesh', state: 'Uttarakhand', isMetroCity: false, isFeatured: true, order: 12, geoLocation: { coordinates: [78.2676, 30.0869] }, popularFor: ['Yoga', 'River Rafting', 'Spirituality'] },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', isMetroCity: true, isFeatured: false, order: 13, geoLocation: { coordinates: [88.3639, 22.5726] }, popularFor: ['Culture', 'Food', 'Durga Puja'] },
  { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu', isMetroCity: true, isFeatured: false, order: 14, geoLocation: { coordinates: [80.2707, 13.0827] }, popularFor: ['Temples', 'Beaches', 'Culture'] },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', isMetroCity: true, isFeatured: false, order: 15, geoLocation: { coordinates: [78.4867, 17.3850] }, popularFor: ['Biryani', 'Heritage', 'Tech'] },
];

const run = async () => {
  logger.info('Seeding cities...');

  for (const city of citiesData) {
    await City.findOneAndUpdate(
      { slug: city.slug },
      { ...city, isActive: true },
      { upsert: true, new: true }
    );
  }

  logger.info(`✅ ${citiesData.length} cities seeded`);
};

export { run };
