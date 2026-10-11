import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthenticationError, AuthorizationError } from '../shared/errors';
import type { UserRole } from '../shared/constants';

/**
 * RBAC. Roles are additive only where stated; every route declares exactly which
 * roles may call it.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError('Your role cannot access this resource'));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireModerator = requireRole('MODERATOR', 'ADMIN');
export const requireOwner = requireRole('OWNER', 'ADMIN');

/**
 * Ownership guard for any resource that carries an owner field.
 *
 * IDOR/BOLA protection: authorization is evaluated on the server against the
 * persisted record, never on an id supplied by the client.
 */
export function requireOwnership<T>(
  loader: (req: Request) => Promise<T | null>,
  getOwnerId: (resource: T) => string,
  options: { allowRoles?: UserRole[] } = {},
): RequestHandler {
  const allowRoles = options.allowRoles ?? [];
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(new AuthenticationError());
        return;
      }
      if (allowRoles.includes(req.user.role)) {
        next();
        return;
      }

      const resource = await loader(req);
      if (!resource) {
        // Let the handler produce the correct 404.
        next();
        return;
      }
      if (getOwnerId(resource) !== req.user.userId) {
        next(new AuthorizationError('You do not own this resource'));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
