import Redis from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';
import { env, isTest } from '../../config/env';
import { logger } from '../../shared/logger';

/**
 * Redis is used for caching, rate limiting, OTP throttling and Socket.IO
 * fan-out. The client is optional: when REDIS_REQUIRED=false (local development)
 * the API degrades to in-process behaviour and advertises `degraded` on
 * /health/ready.
 */

let client: RedisClient | null = null;
let connecting: Promise<RedisClient | null> | null = null;
let available = false;

function createClient(role: string): RedisClient {
  const instance = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 5_000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 3_000),
    connectionName: `${env.SERVICE_NAME}:${role}`,
  });

  instance.on('error', (error) => {
    available = false;
    logger.error({ err: error }, 'redis error');
  });
  instance.on('ready', () => {
    available = true;
    logger.info('redis ready');
  });
  instance.on('end', () => {
    available = false;
    logger.warn('redis connection closed');
  });

  return instance;
}

export async function connectRedis(): Promise<RedisClient | null> {
  if (client && available) {
    return client;
  }
  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    const instance = createClient('main');
    try {
      await instance.connect();
      client = instance;
      available = true;
      return instance;
    } catch (error) {
      logger.warn(
        { err: error },
        env.REDIS_REQUIRED
          ? 'redis connection failed (REDIS_REQUIRED=true)'
          : 'redis unavailable — running in degraded mode',
      );
      instance.disconnect();
      client = null;
      available = false;
      if (env.REDIS_REQUIRED && !isTest) {
        throw error;
      }
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export function getRedisClient(): RedisClient | null {
  return available ? client : null;
}

export function isRedisAvailable(): boolean {
  return available && client !== null;
}

/** Creates an independent connection (BullMQ workers, pub/sub, socket adapter). */
export function createRedisConnection(role: string): RedisClient {
  return createClient(role);
}

export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }
  try {
    await client.quit();
  } catch (error) {
    logger.warn({ err: error }, 'redis quit failed, forcing disconnect');
    client.disconnect();
  } finally {
    client = null;
    available = false;
  }
}

export interface RedisHealth {
  status: 'up' | 'down' | 'disabled';
  latencyMs?: number;
}

export async function checkRedisHealth(): Promise<RedisHealth> {
  if (!client || !available) {
    return { status: env.REDIS_REQUIRED ? 'down' : 'disabled' };
  }
  const startedAt = Date.now();
  try {
    await client.ping();
    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch {
    return { status: 'down' };
  }
}
