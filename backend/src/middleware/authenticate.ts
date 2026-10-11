import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../config/env';
import { AuthenticationError } from '../shared/errors';
import { logger } from '../shared/logger';
import { verifyAccessToken } from '../modules/auth/services/token.service';
import { validateSession } from '../modules/auth/services/session.service';

/**
 * Server-side authorization is authoritative: the token alone is never trusted,
 * the referenced session must still exist and be unrevoked.
 */

function extractToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

function makeAuthMiddleware(required: boolean): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      if (required) {
        next(new AuthenticationError());
        return;
      }
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const session = await validateSession(payload.sid, payload.sub);
      if (!session) {
        if (required) {
          throw new AuthenticationError('Session is no longer valid', 'TOKEN_INVALID');
        }
        next();
        return;
      }

      req.user = session;
      next();
    } catch (error) {
      if (required) {
        next(error);
        return;
      }
      logger.debug({ err: error }, 'optional auth token rejected');
      next();
    }
  };
}

/** Rejects the request when no valid session is present. */
export const authenticate = makeAuthMiddleware(true);

/** Attaches the principal when present, otherwise continues anonymously. */
export const optionalAuthenticate = makeAuthMiddleware(false);

/** Guards actions that require a verified email channel. */
export function requireEmailVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthenticationError());
    return;
  }
  if (!req.user.emailVerified) {
    next(new AuthenticationError('Verify your email address to continue', 'EMAIL_NOT_VERIFIED'));
    return;
  }
  next();
}
