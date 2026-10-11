import type { NextFunction, Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, corsOrigins } from '../config/env';
import { AuthorizationError } from '../shared/errors';

/**
 * CSRF strategy.
 *
 * Auth cookies are httpOnly + SameSite=Lax, so cross-site POSTs from a form or
 * fetch already fail in modern browsers. This middleware adds the second layer:
 * any state-changing request that carries auth cookies must present an Origin
 * (or Referer) belonging to an allowlisted frontend origin. Non-browser clients
 * that authenticate with a Bearer token and send no cookies are unaffected.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isAllowedOrigin(origin: string): boolean {
  return corsOrigins.some((allowed) => origin === allowed || origin.startsWith(`${allowed}/`));
}

function hasAuthCookie(req: Request): boolean {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  return Boolean(cookies?.[ACCESS_TOKEN_COOKIE] || cookies?.[REFRESH_TOKEN_COOKIE]);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Bearer-token clients and requests without auth cookies are not vulnerable
  // to cookie-based CSRF.
  if (!hasAuthCookie(req)) {
    next();
    return;
  }

  const candidate = req.header('origin') ?? req.header('referer');

  if (!candidate) {
    next(
      new AuthorizationError('Request blocked: missing origin for a cookie-authenticated request'),
    );
    return;
  }

  if (!isAllowedOrigin(candidate)) {
    next(new AuthorizationError('Request blocked: origin not allowed'));
    return;
  }

  next();
}
