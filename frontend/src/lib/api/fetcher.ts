import { apiBaseUrl } from '../config/env';
import { ApiError, networkError, toApiError } from './error';
import { withSessionRefresh } from './refresh';
import type { ApiSuccess, PaginationMeta } from './types';

/**
 * One HTTP core for both runtimes. The only difference between server and browser
 * calls is how cookies travel (forwarded explicitly on the server,
 * `credentials: include` in the browser).
 */

export interface ApiResult<T> {
  data: T;
  meta: PaginationMeta;
  status: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** FormData for multipart uploads; `body` must not also be set. */
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | Array<string | number>>;
  /** Cookie header forwarded on the server; ignored in the browser. */
  cookieHeader?: string | null;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export function buildQueryString(query: RequestOptions['query']): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }
    params.append(key, String(value));
  }
  const serialised = params.toString();
  return serialised.length > 0 ? `?${serialised}` : '';
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}${buildQueryString(
    options.query,
  )}`;

  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.cookieHeader) {
    headers.Cookie = options.cookieHeader;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const send = () =>
    fetch(url, {
      method: options.method ?? 'GET',
      headers,
      ...(body !== undefined ? { body } : {}),
      // Server calls forward cookies explicitly; browser calls use the cookie jar.
      ...(options.cookieHeader !== undefined ? {} : { credentials: 'include' }),
      ...(options.cache ? { cache: options.cache } : {}),
      ...(options.next ? { next: options.next } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });

  let response: Response;
  try {
    // In the browser this renews an expired session once and replays the call.
    response = await withSessionRefresh(send, path);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw networkError();
  }

  if (response.status === 204) {
    return { data: undefined as T, meta: {}, status: 204 };
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  const envelope = payload as ApiSuccess<T> | null;
  if (!envelope || envelope.success !== true) {
    throw new ApiError(response.status, {
      code: 'INVALID_RESPONSE',
      message: 'The server returned an unexpected response.',
    });
  }

  return { data: envelope.data, meta: envelope.meta ?? {}, status: response.status };
}

/** Discriminated result for pages that must render even when the API is down. */
export type SafeResult<T> =
  | { ok: true; data: T; meta: PaginationMeta }
  | { ok: false; error: ApiError };

export async function safeRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<SafeResult<T>> {
  try {
    const { data, meta } = await request<T>(path, options);
    return { ok: true, data, meta };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error };
    }
    return { ok: false, error: networkError() };
  }
}
