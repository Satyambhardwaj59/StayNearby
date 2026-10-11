import pino from 'pino';
import { env } from '../../config/env';

/** Structured logger. Secrets, OTPs and tokens are never logged. */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: env.SERVICE_NAME, env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.code',
    ],
    remove: true,
  },
});
