import Category from '../shared/models/Category.model.js';
import SubType from '../shared/models/SubType.model.js';
import { categoriesData, subtypesData } from './productionSeedData.js';
import logger from '../utils/logger.js';

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
