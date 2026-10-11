import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const booleanString = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const optionalString = () => z.string().trim().default('');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().min(1).default('http://localhost:5000'),
  FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  REDIS_REQUIRED: booleanString('true'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  TOKEN_HASH_SECRET: z.string().min(32, 'TOKEN_HASH_SECRET must be at least 32 characters'),
  COOKIE_DOMAIN: optionalString(),
  COOKIE_SECURE: booleanString('false'),
  PASSWORD_HASH_ALGO: z.enum(['argon2id', 'bcrypt']).default('argon2id'),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  CLOUDINARY_CLOUD_NAME: optionalString(),
  CLOUDINARY_API_KEY: optionalString(),
  CLOUDINARY_API_SECRET: optionalString(),
  S3_BUCKET: optionalString(),
  S3_REGION: optionalString(),
  S3_ACCESS_KEY_ID: optionalString(),
  S3_SECRET_ACCESS_KEY: optionalString(),
  S3_ENDPOINT: optionalString(),
  S3_PUBLIC_BASE_URL: optionalString(),

  EMAIL_DRIVER: z.enum(['console', 'smtp', 'api']).default('console'),
  EMAIL_FROM: z.string().default('StayNearby <no-reply@example.com>'),
  EMAIL_API_KEY: optionalString(),
  EMAIL_SMTP_HOST: optionalString(),
  EMAIL_SMTP_PORT: z.coerce.number().int().default(587),
  EMAIL_SMTP_USER: optionalString(),
  EMAIL_SMTP_PASSWORD: optionalString(),

  SMS_DRIVER: z.enum(['console', 'api']).default('console'),
  SMS_API_KEY: optionalString(),
  SMS_SENDER_ID: optionalString(),

  MAP_PROVIDER: z.enum(['nominatim', 'google', 'mapbox']).default('nominatim'),
  MAP_PROVIDER_KEY: optionalString(),
  MAP_DEFAULT_CENTER_LAT: z.coerce.number().min(-90).max(90).default(25.5941),
  MAP_DEFAULT_CENTER_LNG: z.coerce.number().min(-180).max(180).default(85.1376),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(120),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SERVICE_NAME: z.string().default('rental-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalString(),
  SENTRY_DSN: optionalString(),

  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(8),
  MAX_IMAGES_PER_PROPERTY: z.coerce.number().int().min(1).max(60).default(20),
});

export type Env = z.infer<typeof envSchema>;

function additionalValidation(value: Env): string[] {
  const issues: string[] = [];

  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
    issues.push('  - JWT_REFRESH_SECRET: must differ from JWT_ACCESS_SECRET');
  }

  if (value.STORAGE_DRIVER === 'cloudinary') {
    const missing = (['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const).filter(
      (key) => value[key].length === 0,
    );
    if (missing.length > 0) {
      issues.push(`  - ${missing[0]}: required when STORAGE_DRIVER=cloudinary (${missing.join(', ')})`);
    }
  }

  if (value.STORAGE_DRIVER === 's3' && (!value.S3_BUCKET || !value.S3_REGION)) {
    issues.push('  - S3_BUCKET: S3_BUCKET and S3_REGION are required when STORAGE_DRIVER=s3');
  }

  if (value.EMAIL_DRIVER === 'smtp' && !value.EMAIL_SMTP_HOST) {
    issues.push('  - EMAIL_SMTP_HOST: required when EMAIL_DRIVER=smtp');
  }

  if (value.MAP_PROVIDER === 'google' && value.MAP_PROVIDER_KEY.length === 0) {
    issues.push('  - MAP_PROVIDER_KEY: required when MAP_PROVIDER=google');
  }

  if (value.NODE_ENV === 'production') {
    const secrets: Array<[string, string]> = [
      ['JWT_ACCESS_SECRET', value.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', value.JWT_REFRESH_SECRET],
      ['TOKEN_HASH_SECRET', value.TOKEN_HASH_SECRET],
    ];
    for (const [key, secret] of secrets) {
      if (secret.length < 48 || secret.startsWith('dev-only')) {
        issues.push(`  - ${key}: must be a production-grade secret (>= 48 chars, not a placeholder)`);
      }
    }
    if (!value.COOKIE_SECURE) {
      issues.push('  - COOKIE_SECURE: must be true in production');
    }
    if (value.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*')) {
      issues.push('  - CORS_ORIGINS: wildcard origins are not allowed in production');
    }
  }

  return issues;
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const extraIssues = additionalValidation(result.data);
  if (extraIssues.length > 0) {
    throw new Error(`Invalid environment configuration:\n${extraIssues.join('\n')}`);
  }

  return result.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const cookieDefaults = {
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProduction,
  sameSite: 'lax' as const,
  domain: env.COOKIE_DOMAIN.length > 0 ? env.COOKIE_DOMAIN : undefined,
  path: '/',
};

export const ACCESS_TOKEN_COOKIE = 'rm_access_token';
export const REFRESH_TOKEN_COOKIE = 'rm_refresh_token';
