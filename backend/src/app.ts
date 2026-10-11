import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { corsOrigins, env, isProduction } from './config/env';
import { requestId, requestLogger } from './middleware/requestContext';
import { sanitizeRequest } from './middleware/sanitize';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { AuthorizationError } from './shared/errors';
import { limiters } from './middleware/rateLimit';
import { apiRouter } from './routes';
import { healthRouter } from './modules/health';

/**
 * Application factory.
 *
 * Middleware order is security-relevant and deliberate:
 *   correlation id -> access log -> security headers -> CORS -> body limits
 *   -> sanitisation -> CSRF -> rate limit -> routes -> 404 -> error handler
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY > 0) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  app.use(requestId);
  app.use(requestLogger);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          connectSrc: corsOrigins.length > 0 ? corsOrigins : ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'deny' },
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin/server-to-server requests have no Origin header.
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        // A rejected origin is an authorization failure, not a server error.
        callback(new AuthorizationError('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Client-Version'],
      exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 600,
    }),
  );

  app.use(compression());
  // Request size limits: JSON bodies stay small, uploads use multipart routes.
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '128kb' }));
  app.use(cookieParser());
  app.use(hpp());
  app.use(sanitizeRequest);
  app.use(csrfProtection);
  app.use(limiters.global());

  app.use(healthRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
