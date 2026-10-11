import { apiBaseUrl } from '../config/env';

/**
 * Thin client-side wrapper around `fetch` for interactive (Client Component)
 * code.
 *
 * Client components previously called relative API paths, which resolve
 * against the Next.js origin (port 3000) — where no API routes exist — instead
 * of the backend. Every such call 404'd (or returned the HTML 404 page), which
 * is why login, favourites, visits, reviews and the dashboards silently showed
 * empty data.
 *
 * This helper always targets `NEXT_PUBLIC_API_URL` (the versioned backend base
 * URL) and always sends cookies (`credentials: 'include'`), so httpOnly auth
 * cookies travel with the request exactly like they do for the typed client.
 * It returns the native `Response`, so callers keep using `res.ok` / `res.json()`
 * unchanged.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalised}`;

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
}
