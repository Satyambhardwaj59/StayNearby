import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  cookieDefaults,
  env,
} from '../../../config/env';

/** Auth cookies are httpOnly + SameSite=Lax; Secure follows the environment. */

const refreshMaxAge = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const options: CookieOptions = { ...cookieDefaults };
  // The access cookie deliberately lives as long as the refresh cookie rather
  // than the 15-minute access JWT. The JWT's own `exp` claim still enforces the
  // short access lifetime; the longer-lived cookie only means the browser keeps
  // sending it. That lets the API answer an expired request with TOKEN_EXPIRED
  // (refresh and retry) instead of looking like an anonymous/signed-out user.
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...options, maxAge: refreshMaxAge });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...options, maxAge: refreshMaxAge });
}

export function clearAuthCookies(res: Response): void {
  const options: CookieOptions = { ...cookieDefaults };
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
