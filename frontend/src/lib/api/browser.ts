import { request, safeRequest, type ApiResult, type RequestOptions, type SafeResult } from './fetcher';

/**
 * Browser client. Tokens live in httpOnly cookies, so nothing here ever reads or
 * stores a credential — `credentials: 'include'` on the shared fetcher does the
 * work and an XSS cannot exfiltrate a session.
 */
export async function browserRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'cookieHeader'> = {},
): Promise<ApiResult<T>> {
  return request<T>(path, options);
}

export async function safeBrowserRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'cookieHeader'> = {},
): Promise<SafeResult<T>> {
  return safeRequest<T>(path, options);
}
