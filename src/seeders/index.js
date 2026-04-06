import 'dotenv/config';
import { connect, disconnect } from '../config/database.js';
import logger from '../utils/logger.js';
import { run as runAdminSeeder } from './adminSeeder.js';
import { run as runCategorySeeder } from './categorySeeder.js';
import { run as runCitySeeder } from './citySeeder.js';
import { run as runPlanSeeder } from './planSeeder.js';

const runSeeders = async () => {
  await connect();
  logger.info('🌱 Running seeders...');

  try {
    await runAdminSeeder();
    await runCategorySeeder();
    await runCitySeeder();
    await runPlanSeeder();
    logger.info('✅ All seeders completed successfully');
  } catch (err) {
    logger.error({ err }, '❌ Seeder failed');
  } finally {
    await disconnect();
    process.exit(0);
  }
};

runSeeders();
