import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongoose';
import { connectRedis, disconnectRedis } from './infrastructure/redis/client';
import { closeQueues } from './infrastructure/queue/queue';
import { startJobWorkers } from './jobs';
import { initializeSocketServer } from './sockets';
import { logger } from './shared/logger';
import { registerShutdownHook, runShutdownHooks } from './shared/lifecycle';

/**
 * Process entrypoint: connect dependencies, start the HTTP + Socket.IO servers,
 * and wire graceful shutdown so deploys never drop in-flight requests.
 */

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);

  await initializeSocketServer(server);
  const workers = startJobWorkers();

  registerShutdownHook({
    name: 'http-server',
    run: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  });

  registerShutdownHook({
    name: 'background-workers',
    run: async () => {
      await closeQueues(workers);
    },
  });

  registerShutdownHook({ name: 'redis', run: disconnectRedis });
  registerShutdownHook({ name: 'mongodb', run: disconnectDatabase });

  server.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, environment: env.NODE_ENV, pid: process.pid },
      'api listening',
    );
  });

  server.on('error', (error) => {
    logger.fatal({ err: error }, 'http server error');
    void shutdown('server-error', 1);
  });
}

let shuttingDown = false;

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ reason }, 'shutting down');

  await runShutdownHooks();
  logger.info('shutdown complete');
  process.exit(exitCode);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  void shutdown('uncaughtException', 1);
});

void bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'failed to start api');
  process.exit(1);
});
