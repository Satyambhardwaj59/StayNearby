import { apiBaseUrl } from '../config/env';
import { withSessionRefresh } from './refresh';

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
 *
 * The wrapped `withSessionRefresh` renews an expired session once and replays
 * the request, so a stale access cookie is invisible to callers.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalised}`;

  const send = () =>
    fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });

  return withSessionRefresh(send, normalised);
}

/**
 * Human-readable message for a failed response.
 *
 * Tolerates bodies that are not JSON (HTML error pages, empty responses),
 * prefers the first few field-level messages over the generic one, and falls
 * back to the caller's string when nothing usable is present.
 */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await res.json()) as {
      error?: { message?: string; details?: Array<{ message?: string }> };
    } | null;

    const details = payload?.error?.details;
    if (Array.isArray(details)) {
      const messages = details
        .slice(0, 3)
        .map((detail) => detail?.message)
        .filter((message): message is string => typeof message === 'string' && message.length > 0);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    const message = payload?.error?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  } catch {
    // Non-JSON body — fall through to the fallback.
  }

  return fallback;
}
