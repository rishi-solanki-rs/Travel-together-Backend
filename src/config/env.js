import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  APP_NAME: z.string().default('TogetherInIndia'),
  API_VERSION: z.string().default('v1'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_URI_TEST: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PASSWORD_RESET_SECRET: z.string().min(16),
  PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_PRESET: z.string().default('together_in_india'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().default('0').transform(Number),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform(v => v === 'true'),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('Together In India'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  DEFAULT_PAGE_SIZE: z.string().default('20').transform(Number),
  MAX_PAGE_SIZE: z.string().default('100').transform(Number),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  ADMIN_EMAIL: z.string().email().default('admin@togetherinIndia.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  ADMIN_NAME: z.string().default('Super Admin'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
};

export default parseEnv();
