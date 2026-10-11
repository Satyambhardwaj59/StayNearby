import type { Request, RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator, type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { getRedisClient } from '../infrastructure/redis/client';
import { sendError } from '../shared/response';

/**
 * Redis-backed rate limiting shared by all instances, so limits hold when the
 * API runs behind a load balancer. When Redis is unavailable the in-memory store
 * is used as a degraded fallback (per-instance limits) so brute-force protection
 * is never silently disabled.
 */
function buildStore(prefix: string): Store | undefined {
  const client = getRedisClient();
  if (!client) {
    return undefined;
  }
  try {
    return new RedisStore({
      prefix: `${env.SERVICE_NAME}:ratelimit:${prefix}:`,
      sendCommand: ((...args: string[]) =>
        client.call(args[0] as string, ...args.slice(1))) as unknown as (
        ...args: string[]
      ) => Promise<never>,
    });
  } catch (error) {
    logger.warn({ err: error, prefix }, 'redis rate-limit store init failed');
    return undefined;
  }
}

export interface RateLimitOptions {
  key: string;
  windowSeconds?: number;
  max?: number;
  keyByUser?: boolean;
  keyByBodyField?: string;
  skipSuccessfulRequests?: boolean;
}

export function rateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs = (options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS) * 1_000;
  const limit = options.max ?? env.RATE_LIMIT_MAX_REQUESTS;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: buildStore(options.key),
    keyGenerator: (req: Request) => {
      if (options.keyByUser && req.user) {
        return `user:${req.user.userId}`;
      }
      // ipKeyGenerator normalises IPv6 addresses to a subnet so one client
      // cannot rotate address suffixes to bypass the limit.
      const ip = ipKeyGenerator(req.ip ?? 'unknown');
      if (options.keyByBodyField) {
        const value = (req.body as Record<string, unknown> | undefined)?.[options.keyByBodyField];
        if (typeof value === 'string' && value.length > 0) {
          return `field:${value.toLowerCase()}:${ip}`;
        }
      }
      return `ip:${ip}`;
    },
    ...(options.skipSuccessfulRequests ? { skipSuccessfulRequests: true } : {}),
    handler: (_req, res) => {
      sendError(
        res,
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        429,
      );
    },
  });
}

/** Pre-configured buckets for sensitive endpoints. */
export const limiters = {
  global: (): RequestHandler =>
    rateLimiter({ key: 'global', windowSeconds: 60, max: env.RATE_LIMIT_MAX_REQUESTS }),
  register: (): RequestHandler => rateLimiter({ key: 'auth:register', windowSeconds: 3600, max: 10 }),
  login: (): RequestHandler =>
    rateLimiter({
      key: 'auth:login',
      windowSeconds: 900,
      max: 10,
      keyByBodyField: 'email',
      skipSuccessfulRequests: true,
    }),
  passwordReset: (): RequestHandler =>
    rateLimiter({ key: 'auth:password-reset', windowSeconds: 3600, max: 5, keyByBodyField: 'email' }),
  otpRequest: (): RequestHandler =>
    rateLimiter({ key: 'auth:otp-request', windowSeconds: 3600, max: 6, keyByBodyField: 'phone' }),
  otpVerify: (): RequestHandler =>
    rateLimiter({ key: 'auth:otp-verify', windowSeconds: 900, max: 15, keyByBodyField: 'phone' }),
  refresh: (): RequestHandler => rateLimiter({ key: 'auth:refresh', windowSeconds: 900, max: 60 }),
  search: (): RequestHandler => rateLimiter({ key: 'search', windowSeconds: 60, max: 120 }),
  chat: (): RequestHandler => rateLimiter({ key: 'chat', windowSeconds: 60, max: 90, keyByUser: true }),
  propertyWrite: (): RequestHandler =>
    rateLimiter({ key: 'property:write', windowSeconds: 3600, max: 60, keyByUser: true }),
  report: (): RequestHandler =>
    rateLimiter({ key: 'report:create', windowSeconds: 3600, max: 20, keyByUser: true }),
  upload: (): RequestHandler =>
    rateLimiter({ key: 'upload', windowSeconds: 3600, max: 120, keyByUser: true }),
  review: (): RequestHandler =>
    rateLimiter({ key: 'review:create', windowSeconds: 86_400, max: 10, keyByUser: true }),
  visit: (): RequestHandler =>
    rateLimiter({ key: 'visit:create', windowSeconds: 86_400, max: 20, keyByUser: true }),
} as const;
