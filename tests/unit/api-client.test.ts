import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetApiClientState,
  apiClient,
  apiRequest,
  buildUrl,
  setAuthFailureHandler,
} from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';

const API = 'http://localhost:4000/api/v1';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const ok = (data: unknown, meta?: unknown) =>
  json(200, { success: true, data, ...(meta ? { meta } : {}) });
const unauthorized = () =>
  json(401, {
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  __resetApiClientState();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const urlOf = (input: Parameters<typeof fetch>[0] | undefined): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : (input?.url ?? '');
const callUrl = (index: number) => urlOf(fetchMock.mock.calls[index]?.[0]);
const callInit = (index: number) => fetchMock.mock.calls[index]?.[1] ?? {};
const callHeaders = (index: number) => (callInit(index).headers ?? {}) as Record<string, string>;

describe('buildUrl', () => {
  it('joins base URL, path and query, skipping empty values', () => {
    expect(
      buildUrl('/products', { page: 2, q: 'shoe', brand: ['a', 'b'], empty: '', none: undefined }),
    ).toBe(`${API}/products?page=2&q=shoe&brand=a&brand=b`);
  });

  it('rejects relative paths', () => {
    expect(() => buildUrl('products')).toThrow();
  });
});

describe('apiRequest', () => {
  it('unwraps the success envelope and returns meta', async () => {
    fetchMock.mockResolvedValueOnce(ok([{ id: '1' }], { pagination: { nextCursor: 'abc' } }));
    const result = await apiRequest<{ id: string }[]>('/products');
    expect(result.data).toEqual([{ id: '1' }]);
    expect(result.meta?.pagination?.nextCursor).toBe('abc');
  });

  it('always sends credentials: include', async () => {
    fetchMock.mockResolvedValueOnce(ok(null));
    await apiClient.get('/health');
    expect(callInit(0).credentials).toBe('include');
  });

  it('adds X-CSRF-Token from the csrf_token cookie on non-GET requests only', async () => {
    document.cookie = 'csrf_token=tok-123; path=/';
    fetchMock.mockResolvedValueOnce(ok(null)).mockResolvedValueOnce(ok(null));

    await apiClient.get('/health');
    await apiClient.post('/cart/items', { variantId: 'v1', quantity: 1 });

    expect(callHeaders(0)['X-CSRF-Token']).toBeUndefined();
    expect(callHeaders(1)['X-CSRF-Token']).toBe('tok-123');
    expect(callHeaders(1)['Content-Type']).toBe('application/json');
    expect(callInit(1).body).toBe(JSON.stringify({ variantId: 'v1', quantity: 1 }));
  });

  it('normalizes error envelopes into ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      json(422, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{ path: 'email', message: 'Invalid email' }],
          requestId: 'req-1',
        },
      }),
    );
    const error = await apiClient.post('/x', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'email', message: 'Invalid email' }],
      requestId: 'req-1',
    });
  });

  it('normalizes non-envelope errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 502,
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('maps network failures to NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiClient.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('returns accepted non-2xx success envelopes (e.g. degraded health 503)', async () => {
    fetchMock.mockResolvedValueOnce(json(503, { success: true, data: { status: 'degraded' } }));
    await expect(apiClient.get('/health', { acceptStatuses: [503] })).resolves.toEqual({
      status: 'degraded',
    });
  });

  it('handles 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiClient.delete('/cart/items/1')).resolves.toBeUndefined();
  });
});

describe('401 handling', () => {
  it('refreshes once and retries the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { success: true, data: null })) // refresh
      .mockResolvedValueOnce(ok({ id: 'me' }));

    await expect(apiClient.get('/users/me')).resolves.toEqual({ id: 'me' });
    expect(callUrl(1)).toBe(`${API}/auth/refresh`);
    expect(callInit(1).method).toBe('POST');
    expect(callUrl(2)).toBe(`${API}/users/me`);
  });

  it('uses a single in-flight refresh for concurrent 401s', async () => {
    let resolveRefresh!: (r: Response) => void;
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/auth/refresh')) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      const attempt = fetchMock.mock.calls.filter((c) => urlOf(c[0]) === url).length;
      return Promise.resolve(attempt === 1 ? unauthorized() : ok(url));
    });

    const requests = Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);
    await vi.waitFor(() => {
      expect(resolveRefresh).toBeTypeOf('function');
    });
    // Give the other two 401s time to join the in-flight refresh.
    await new Promise((r) => setTimeout(r, 10));
    resolveRefresh(json(200, { success: true, data: null }));

    await expect(requests).resolves.toEqual([`${API}/a`, `${API}/b`, `${API}/c`]);
    const refreshCalls = fetchMock.mock.calls.filter((c) => urlOf(c[0]).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('calls the auth-failure handler and throws when refresh fails', async () => {
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not loop if the retried request is still 401', async () => {
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { success: true, data: null }))
      .mockResolvedValueOnce(unauthorized());

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not try to refresh on auth endpoints (bad credentials)', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }),
    );
    await expect(
      apiClient.post('/auth/login', { email: 'a@b.c', password: 'x' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the CSRF header on the refresh call', async () => {
    document.cookie = 'csrf_token=tok-9; path=/';
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, { success: true, data: null }))
      .mockResolvedValueOnce(ok(1));
    await apiClient.get('/users/me');
    expect(callHeaders(1)['X-CSRF-Token']).toBe('tok-9');
  });
});
