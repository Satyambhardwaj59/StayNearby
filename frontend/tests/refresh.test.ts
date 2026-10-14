import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withSessionRefresh } from '@/lib/api/refresh';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unauthorized = (code: string) =>
  jsonResponse({ success: false, error: { code, message: 'nope' } }, 401);

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Simulate the browser: window exists so refresh is allowed.
  vi.stubGlobal('window', {});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('withSessionRefresh', () => {
  it('renews once and retries on TOKEN_EXPIRED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }, 200));
    const send = vi
      .fn()
      .mockResolvedValueOnce(unauthorized('TOKEN_EXPIRED'))
      .mockResolvedValueOnce(jsonResponse({ success: true }, 200));

    const response = await withSessionRefresh(send, '/favorites');

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
  });

  it('renews once for a legacy AUTHENTICATION_REQUIRED session', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }, 200));
    const send = vi
      .fn()
      .mockResolvedValueOnce(unauthorized('AUTHENTICATION_REQUIRED'))
      .mockResolvedValueOnce(jsonResponse({ success: true }, 200));

    const response = await withSessionRefresh(send, '/favorites');

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares a single refresh across concurrent requests', async () => {
    let release!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );

    const send = vi
      .fn()
      .mockResolvedValueOnce(unauthorized('TOKEN_EXPIRED'))
      .mockResolvedValueOnce(unauthorized('TOKEN_EXPIRED'))
      .mockResolvedValueOnce(jsonResponse({ success: true }, 200))
      .mockResolvedValueOnce(jsonResponse({ success: true }, 200));

    const first = withSessionRefresh(send, '/favorites');
    const second = withSessionRefresh(send, '/favorites');

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    release(jsonResponse({ success: true }, 200));

    const [a, b] = await Promise.all([first, second]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(4);
  });

  it('returns the original 401 if renewal fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: { code: 'TOKEN_INVALID' } }, 401),
    );
    const original = unauthorized('TOKEN_EXPIRED');
    const send = vi.fn().mockResolvedValue(original);

    const response = await withSessionRefresh(send, '/favorites');

    expect(response).toBe(original);
    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['/auth/login', '/auth/register', '/auth/refresh', '/auth/password/forgot'])(
    'never refreshes for %s',
    async (path) => {
      const response = unauthorized('TOKEN_EXPIRED');
      const send = vi.fn().mockResolvedValue(response);

      const result = await withSessionRefresh(send, path);

      expect(result).toBe(response);
      expect(send).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('ignores 401s that are not expiry-related', async () => {
    const response = unauthorized('TOKEN_INVALID');
    const send = vi.fn().mockResolvedValue(response);

    const result = await withSessionRefresh(send, '/favorites');

    expect(result).toBe(response);
    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing on the server', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchMock);

    const response = unauthorized('TOKEN_EXPIRED');
    const send = vi.fn().mockResolvedValue(response);

    const result = await withSessionRefresh(send, '/favorites');

    expect(result).toBe(response);
    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
