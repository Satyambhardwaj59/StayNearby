import type { Request, Response } from 'express';
import { checkDatabaseHealth } from '../../infrastructure/database/mongoose';
import { checkRedisHealth } from '../../infrastructure/redis/client';
import { env } from '../../config/env';

/**
 * Health endpoints are unauthenticated by design but expose only coarse status:
 * no host names, credentials or internal topology.
 */

const startedAt = Date.now();

export function liveness(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: env.SERVICE_NAME,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1_000),
  });
}

export async function readiness(_req: Request, res: Response): Promise<void> {
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const dependencies = {
    database: {
      status: database.status,
      ...(database.latencyMs !== undefined ? { latencyMs: database.latencyMs } : {}),
    },
    redis,
  };

  // Redis is optional in development (degraded mode) but required in production.
  const requiredDependenciesUp =
    database.status === 'up' && (redis.status === 'up' || redis.status === 'disabled');
  const ready = requiredDependenciesUp && (!env.REDIS_REQUIRED || redis.status === 'up');

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1_000),
    dependencies,
  });
}

export async function health(_req: Request, res: Response): Promise<void> {
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
  const ready = database.status === 'up';

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: env.SERVICE_NAME,
    version: process.env.npm_package_version ?? '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1_000),
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    },
    dependencies: {
      database: { status: database.status },
      redis: { status: redis.status },
    },
  });
}
