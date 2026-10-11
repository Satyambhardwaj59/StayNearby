import mongoose from 'mongoose';
import { env, isProduction } from '../../config/env';
import { logger } from '../../shared/logger';

/**
 * Single Mongo connection for the process. Pooling, timeouts and hardening
 * options are centralised here so every repository inherits them.
 */

let listenersRegistered = false;

function registerListeners(): void {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  mongoose.connection.on('connected', () => logger.info('mongodb connected'));
  mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
  mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
  mongoose.connection.on('error', (error) => logger.error({ err: error }, 'mongodb error'));
}

export async function connectDatabase(): Promise<void> {
  registerListeners();

  // `sanitizeFilter` strips query operators from filters, the last line of
  // defence behind the request sanitiser against NoSQL operator injection.
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  // Indexes are managed explicitly; production builds run scripts/ensureIndexes.ts.
  mongoose.set('autoIndex', !isProduction);

  await mongoose.connect(env.MONGODB_URI, {
    appName: env.SERVICE_NAME,
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 10_000,
    retryWrites: true,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
  logger.info('mongodb connection closed');
}

export interface HealthResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<HealthResult> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return { status: 'down', error: 'connection not ready' };
  }

  const startedAt = Date.now();
  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: 'down', error: error instanceof Error ? error.message : 'ping failed' };
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
