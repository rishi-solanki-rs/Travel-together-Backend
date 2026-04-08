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

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:4200'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  DEFAULT_PAGE_SIZE: z.string().default('20').transform(Number),
  MAX_PAGE_SIZE: z.string().default('100').transform(Number),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  FF_SLOT_TX_ASSIGN: z.string().default('true').transform(v => v === 'true'),
  FF_PAGES_BATCH_ENRICH: z.string().default('true').transform(v => v === 'true'),
  FF_UPLOAD_STREAM_MODE: z.string().default('true').transform(v => v === 'true'),

  MEDIA_CLEANUP_DRY_RUN: z.string().default('true').transform(v => v === 'true'),
  MEDIA_CLEANUP_GRACE_HOURS: z.string().default('72').transform(Number),
  MEDIA_DELETE_MAX_RETRIES: z.string().default('5').transform(Number),

  ALERT_NEGATIVE_INVENTORY_THRESHOLD: z.string().default('1').transform(Number),
  ALERT_SLOT_MISMATCH_THRESHOLD: z.string().default('1').transform(Number),
  ALERT_PAYMENT_MISMATCH_THRESHOLD: z.string().default('1').transform(Number),
  ALERT_RECON_DRIFT_THRESHOLD: z.string().default('1').transform(Number),
  ALERT_DLQ_GROWTH_THRESHOLD: z.string().default('10').transform(Number),
  ALERT_DELETE_RETRY_THRESHOLD: z.string().default('5').transform(Number),
  ALERT_HOMEPAGE_P95_MS: z.string().default('1200').transform(Number),
  ALERT_BOOKING_FAILURE_THRESHOLD: z.string().default('5').transform(Number),
  ALERT_DUPLICATE_CHECKOUT_THRESHOLD: z.string().default('5').transform(Number),
  ALERT_MEMORY_PRESSURE_MB: z.string().default('512').transform(Number),
  ALERT_WEBHOOK_URL: z.string().optional().default(''),
  SLACK_ALERT_WEBHOOK_URL: z.string().optional().default(''),
  PAGERDUTY_EVENTS_URL: z.string().optional().default(''),
  PAGERDUTY_ROUTING_KEY: z.string().optional().default(''),

  OUTBOUND_WEBHOOK_ALLOWLIST: z.string().default(''),
  DLQ_ENCRYPTION_KEY: z.string().optional().default(''),
  BREAK_GLASS_TOKEN: z.string().optional().default(''),
  STEP_UP_MAX_AGE_MS: z.string().default('600000').transform(Number),
  MALWARE_BLOCK_PATTERNS: z.string().default('eicar,test-malware'),
  MAX_REQUEST_BODY_BYTES: z.string().default('10485760').transform(Number),
  MAX_RUNTIME_RSS_MB: z.string().default('1024').transform(Number),
  BOT_SPIKE_THRESHOLD: z.string().default('200').transform(Number),
  CHILD_DATA_RETENTION_DAYS: z.string().default('365').transform(Number),
  WEBHOOK_PRIMARY_SECRET: z.string().optional().default(''),
  WEBHOOK_PAYOUT_SECRET: z.string().optional().default(''),

  ADMIN_EMAIL: z.string().email().default('admin@togetherinIndia.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  ADMIN_NAME: z.string().default('Super Admin'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    if (process.env.NODE_ENV === 'test') {
      const fallback = {
        ...process.env,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/together-in-india-test',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test_access_secret_which_is_long_enough_123',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_which_is_long_enough_456',
        PASSWORD_RESET_SECRET: process.env.PASSWORD_RESET_SECRET || 'test_reset_secret_12345',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || 'test-api-key',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'test-api-secret',
        SMTP_USER: process.env.SMTP_USER || 'test@example.com',
        SMTP_PASS: process.env.SMTP_PASS || 'test-password',
        EMAIL_FROM: process.env.EMAIL_FROM || 'test@example.com',
        FF_UPLOAD_STREAM_MODE: process.env.FF_UPLOAD_STREAM_MODE || 'true',
        ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',
        SLACK_ALERT_WEBHOOK_URL: process.env.SLACK_ALERT_WEBHOOK_URL || '',
        PAGERDUTY_EVENTS_URL: process.env.PAGERDUTY_EVENTS_URL || '',
        PAGERDUTY_ROUTING_KEY: process.env.PAGERDUTY_ROUTING_KEY || '',
        OUTBOUND_WEBHOOK_ALLOWLIST: process.env.OUTBOUND_WEBHOOK_ALLOWLIST || '',
        DLQ_ENCRYPTION_KEY: process.env.DLQ_ENCRYPTION_KEY || '',
        BREAK_GLASS_TOKEN: process.env.BREAK_GLASS_TOKEN || '',
        WEBHOOK_PRIMARY_SECRET: process.env.WEBHOOK_PRIMARY_SECRET || '',
        WEBHOOK_PAYOUT_SECRET: process.env.WEBHOOK_PAYOUT_SECRET || '',
      };
      return envSchema.parse(fallback);
    }
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
};

export default parseEnv();
