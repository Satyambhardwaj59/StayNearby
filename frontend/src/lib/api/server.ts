import { cookies } from 'next/headers';
import { request, safeRequest, type ApiResult, type RequestOptions, type SafeResult } from './fetcher';

/**
 * Server-side client used by Server Components, metadata functions and sitemaps.
 *
 * Auth cookies are forwarded explicitly so server-rendered pages can render the
 * authenticated view in the initial HTML — which is what makes the public pages
 * crawlable.
 */
export const AUTH_COOKIE_NAMES = ['rm_access_token', 'rm_refresh_token'] as const;

export async function authCookieHeader(): Promise<string | null> {
  const store = await cookies();
  const parts = AUTH_COOKIE_NAMES.map((name) => {
    const value = store.get(name)?.value;
    return value ? `${name}=${value}` : null;
  }).filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join('; ') : null;
}

export async function serverRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'cookieHeader'> = {},
): Promise<ApiResult<T>> {
  const cookieHeader = await authCookieHeader();
  return request<T>(path, { ...options, cookieHeader });
}

export async function safeServerRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'cookieHeader'> = {},
): Promise<SafeResult<T>> {
  const cookieHeader = await authCookieHeader();
  return safeRequest<T>(path, { ...options, cookieHeader });
}

/** Server requests are per-request by default; opt into ISR with `next.revalidate`. */
export const defaultServerOptions: Omit<RequestOptions, 'cookieHeader'> = {
  cache: 'no-store',
};
