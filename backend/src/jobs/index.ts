import {
  QUEUE_NAMES,
  startWorker,
  type QueueName,
  type StartedWorker,
} from '../infrastructure/queue/queue';
import { logger } from '../shared/logger';

/**
 * Background job subsystem.
 *
 * Each feature module owns its handlers and registers them here, so adding a job
 * never requires touching shared infrastructure. Queues are only started when
 * Redis is reachable; otherwise the API reports degraded mode.
 *
 * Feature registration functions are added as modules land (auth, properties,
 * notifications, saved-searches, visits). With none registered yet, workers
 * simply ignore unknown job names.
 */

export type JobHandler = (payload: unknown) => Promise<void>;

const handlers = new Map<string, JobHandler>();

function handlerKey(queue: QueueName, name: string): string {
  return `${queue}::${name}`;
}

export function registerJobHandler(queue: QueueName, name: string, handler: JobHandler): void {
  const key = handlerKey(queue, name);
  if (handlers.has(key)) {
    logger.warn({ queue, job: name }, 'job handler overwritten');
  }
  handlers.set(key, handler);
}

export function registerAllJobHandlers(): void {
  handlers.clear();
  // Feature modules register their handlers here, e.g. registerAuthJobs(),
  // registerPropertyJobs(). Kept intentionally empty in the scaffold.
}

export function startJobWorkers(): StartedWorker[] {
  registerAllJobHandlers();

  const started: StartedWorker[] = [];
  for (const queue of Object.values(QUEUE_NAMES)) {
    const worker = startWorker(queue, async (job) => {
      const handler = handlers.get(handlerKey(queue, job.name));
      if (!handler) {
        logger.debug({ queue, job: job.name }, 'no handler registered, job ignored');
        return;
      }
      await handler(job.data);
    });
    if (worker) {
      started.push(worker);
    }
  }

  if (started.length > 0) {
    logger.info({ queues: started.map((entry) => entry.name) }, 'job workers started');
  } else {
    logger.warn('job workers not started (redis unavailable) — background work is disabled');
  }

  return started;
}
