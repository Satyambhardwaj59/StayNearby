import { logger } from './logger';

/**
 * Graceful shutdown registry. Subsystems (HTTP server, Mongo, Redis, Socket.IO,
 * BullMQ workers) register a hook here and the process drains them in reverse
 * registration order on SIGTERM/SIGINT.
 */

export interface ShutdownHook {
  name: string;
  run: () => Promise<void>;
}

const hooks: ShutdownHook[] = [];
let shuttingDown = false;

export function registerShutdownHook(hook: ShutdownHook): void {
  hooks.push(hook);
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export async function runShutdownHooks(timeoutMs = 15_000): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  const pending = [...hooks].reverse();
  const deadline = Date.now() + timeoutMs;

  for (const hook of pending) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      logger.warn({ hook: hook.name }, 'shutdown budget exhausted, skipping hook');
      continue;
    }

    try {
      await Promise.race([
        hook.run(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('shutdown hook timed out')), remaining),
        ),
      ]);
      logger.debug({ hook: hook.name }, 'shutdown hook completed');
    } catch (error) {
      logger.error({ err: error, hook: hook.name }, 'shutdown hook failed');
    }
  }
}
