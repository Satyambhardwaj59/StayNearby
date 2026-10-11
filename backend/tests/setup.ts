/**
 * Test environment.
 *
 * Configuration is validated at import time, so every required variable is set
 * here before any application module is loaded. Tests never require MongoDB or
 * Redis: anything that would need them is mocked or skipped.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.API_PUBLIC_URL = 'http://localhost:5099';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/rental_marketplace_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
// Redis is optional in tests: cache/queue paths degrade instead of failing.
process.env.REDIS_REQUIRED = 'false';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
process.env.TOKEN_HASH_SECRET =
  process.env.TOKEN_HASH_SECRET ?? 'test-token-hash-secret-cccccccccccccccccccccccccccccccc';
process.env.COOKIE_SECURE = 'false';
process.env.PASSWORD_HASH_ALGO = 'bcrypt';
process.env.LOG_LEVEL = 'silent';
process.env.STORAGE_DRIVER = 'local';
process.env.EMAIL_DRIVER = 'console';
process.env.SMS_DRIVER = 'console';
process.env.MAP_PROVIDER = 'nominatim';
