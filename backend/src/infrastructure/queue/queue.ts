import {
  Queue,
  QueueEvents,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
} from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { isRedisAvailable } from '../redis/client';

/**
 * BullMQ pipeline. Every expensive side effect (email, SMS, notifications,
 * matching, expiration, cleanup) runs here so API requests stay fast.
 *
 * Job payloads must never contain passwords, tokens or reusable secrets; workers
 * re-read entities from MongoDB by id.
 */

export const QUEUE_NAMES = {
  email: 'email',
  sms: 'sms',
  notifications: 'notifications',
  imageProcessing: 'image-processing',
  savedSearchMatching: 'saved-search-matching',
  listingLifecycle: 'listing-lifecycle',
  reminders: 'reminders',
  cleanup: 'cleanup',
  analytics: 'analytics',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();
let queueEvents: QueueEvents | null = null;

function connectionFromUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';
  return {
    host: parsed.hostname,
    port: parsed.port.length > 0 ? Number(parsed.port) : 6379,
    ...(parsed.username.length > 0 ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password !== null && parsed.password !== undefined && parsed.password.length > 0
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
    ...(isTls ? { tls: {} } : {}),
  };
}

export function getQueue(name: QueueName): Queue | null {
  if (!isRedisAvailable()) {
    return null;
  }
  const existing = queues.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, {
    connection: connectionFromUrl(env.REDIS_URL),
    prefix: `${env.SERVICE_NAME}:queue`,
    defaultJobOptions: {
      removeOnComplete: { age: 3_600, count: 500 },
      removeOnFail: { age: 86_400 * 7 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    },
  });
  queues.set(name, queue);
  return queue;
}

export async function enqueue<T extends object>(
  name: QueueName,
  jobName: string,
  payload: T,
  options: JobsOptions = {},
): Promise<string | null> {
  const queue = getQueue(name);
  if (!queue) {
    logger.warn({ queue: name, job: jobName }, 'redis unavailable, job skipped (degraded mode)');
    return null;
  }
  const job = await queue.add(jobName, payload, options);
  return job.id ?? null;
}

/** Deduplicated enqueue: repeated triggers inside the window collapse into one job. */
export async function enqueueUnique<T extends object>(
  name: QueueName,
  jobName: string,
  payload: T,
  dedupeKey: string,
  options: JobsOptions = {},
): Promise<string | null> {
  return enqueue(name, jobName, payload, {
    ...options,
    jobId: `${jobName}:${dedupeKey}`,
  });
}

export type JobProcessor = (job: { name: string; data: unknown; id?: string }) => Promise<void>;

export interface StartedWorker {
  name: QueueName;
  worker: Worker;
}

export function startWorker(
  name: QueueName,
  processor: JobProcessor,
  options: { concurrency?: number } = {},
): StartedWorker | null {
  if (!isRedisAvailable()) {
    return null;
  }

  const worker = new Worker(
    name,
    async (job) => {
      const startedAt = Date.now();
      await processor({ name: job.name, data: job.data, ...(job.id ? { id: job.id } : {}) });
      logger.debug({ queue: name, job: job.name, durationMs: Date.now() - startedAt }, 'job done');
    },
    {
      connection: connectionFromUrl(env.REDIS_URL),
      prefix: `${env.SERVICE_NAME}:queue`,
      concurrency: options.concurrency ?? 5,
    },
  );

  worker.on('failed', (job, error) => {
    logger.error({ err: error, queue: name, job: job?.name }, 'job failed');
  });
  worker.on('error', (error) => logger.error({ err: error, queue: name }, 'worker error'));

  return { name, worker };
}

export async function startQueueEvents(): Promise<QueueEvents | null> {
  if (!isRedisAvailable()) {
    return null;
  }
  queueEvents = new QueueEvents(QUEUE_NAMES.listingLifecycle, {
    connection: connectionFromUrl(env.REDIS_URL),
    prefix: `${env.SERVICE_NAME}:queue`,
  });
  return queueEvents;
}

export async function closeQueues(workers: StartedWorker[]): Promise<void> {
  await Promise.all(workers.map(({ worker }) => worker.close()));
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  logger.info('queue subsystem closed');
}

export function redisConnectionOptions(): ConnectionOptions {
  return connectionFromUrl(env.REDIS_URL);
}
