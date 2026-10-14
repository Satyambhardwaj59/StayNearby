import { apiBaseUrl } from '../config/env';

/**
 * Transparent session renewal for the browser HTTP clients.
 *
 * The access token lives in an httpOnly cookie and expires well before the
 * refresh token does. When a request comes back 401 the API distinguishes an
 * expired token (`TOKEN_EXPIRED`) from a genuine lack of session. In the first
 * case we renew and replay the request once, so the user never sees a spurious
 * signed-out state mid-session.
 */

/** Credential endpoints: a 401 here is an answer, never something to refresh. */
const NO_REFRESH_PATTERN = /^\/?auth\/(login|register|refresh|password\/(forgot|reset)|email\/)/;

/**
 * One shared in-flight renewal. The refresh endpoint ROTATES the refresh token,
 * so two parallel rotations would invalidate each other — concurrent callers
 * must await the same promise.
 */
let refreshPromise: Promise<boolean> | null = null;

/** Sessions created before the cookie-lifetime fix get one best-effort renewal per page load. */
let legacyRefreshAttempted = false;

function renewSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Read the machine-readable error code without consuming the caller's body. */
async function errorCode(response: Response): Promise<string | null> {
  try {
    const payload = (await response.clone().json()) as { error?: { code?: string } } | null;
    return payload?.error?.code ?? null;
  } catch {
    return null;
  }
}

export async function withSessionRefresh(
  send: () => Promise<Response>,
  path: string,
): Promise<Response> {
  const response = await send();

  // Only the browser can (and should) rotate cookies via a same-site POST.
  if (typeof window === 'undefined' || response.status !== 401) {
    return response;
  }
  if (NO_REFRESH_PATTERN.test(path)) {
    return response;
  }

  const code = await errorCode(response);

  if (code === 'TOKEN_EXPIRED') {
    if (await renewSession()) {
      return send();
    }
    return response;
  }

  // A session predating the cookie-lifetime fix looks anonymous rather than
  // expired. Give it exactly one renewal attempt per page load.
  if (code === 'AUTHENTICATION_REQUIRED' && !legacyRefreshAttempted) {
    legacyRefreshAttempted = true;
    if (await renewSession()) {
      return send();
    }
  }

  return response;
}
