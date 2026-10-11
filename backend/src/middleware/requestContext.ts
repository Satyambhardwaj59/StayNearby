import type { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { logger } from '../shared/logger';

/**
 * Correlation ids make a request traceable across instances and queues. An
 * inbound `x-request-id` is only honoured when it looks like a uuid, so clients
 * cannot inject arbitrary content into logs.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header('x-request-id');
  const value = inbound && UUID_PATTERN.test(inbound) ? inbound : randomUUID();

  req.requestId = value;
  res.locals.requestId = value;
  res.setHeader('x-request-id', value);
  next();
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId,
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customProps: (req) => {
    const request = req as Request;
    return {
      requestId: request.requestId,
      userId: request.user?.userId,
      role: request.user?.role,
    };
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/health/live',
  },
});
