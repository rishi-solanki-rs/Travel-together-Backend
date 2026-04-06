import User from '../shared/models/User.model.js';
import Role from '../shared/models/Role.model.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { USER_ROLES } from '../shared/constants/index.js';

const run = async () => {
  logger.info('Seeding admin user and roles...');

  const roles = [
    { name: USER_ROLES.SUPER_ADMIN, displayName: 'Super Administrator', description: 'Full platform access', isSystem: true },
    { name: USER_ROLES.CITY_ADMIN, displayName: 'City Administrator', description: 'Manage specific city operations', isSystem: true },
    { name: USER_ROLES.VENDOR_ADMIN, displayName: 'Vendor Administrator', description: 'Manage vendor business', isSystem: true },
    { name: USER_ROLES.VENDOR_STAFF, displayName: 'Vendor Staff', description: 'Vendor support staff', isSystem: true },
    { name: USER_ROLES.USER, displayName: 'User', description: 'Regular platform user', isSystem: true },
  ];

  for (const role of roles) {
    await Role.findOneAndUpdate({ name: role.name }, role, { upsert: true, new: true });
  }

  const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL });
  if (!existingAdmin) {
    await User.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: USER_ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`✅ Admin created: ${env.ADMIN_EMAIL}`);
  } else {
    logger.info(`ℹ️  Admin already exists: ${env.ADMIN_EMAIL}`);
  }

  logger.info('✅ Admin seeder complete');
};

export { run };
