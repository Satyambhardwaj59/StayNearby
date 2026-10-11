import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  cookieDefaults,
  env,
} from '../../../config/env';

/** Auth cookies are httpOnly + SameSite=Lax; Secure follows the environment. */

function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    return 15 * 60 * 1_000;
  }
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1_000;
    case 'h':
      return amount * 3_600_000;
    case 'd':
      return amount * 86_400_000;
    case 'm':
    default:
      return amount * 60_000;
  }
}

const accessMaxAge = parseDurationMs(env.ACCESS_TOKEN_TTL);
const refreshMaxAge = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const options: CookieOptions = { ...cookieDefaults };
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...options, maxAge: accessMaxAge });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...options, maxAge: refreshMaxAge });
}

export function clearAuthCookies(res: Response): void {
  const options: CookieOptions = { ...cookieDefaults };
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}
