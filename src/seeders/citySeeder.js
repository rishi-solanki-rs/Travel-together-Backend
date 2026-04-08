import City from '../shared/models/City.model.js';
import { citiesData } from './productionSeedData.js';
import logger from '../utils/logger.js';

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
