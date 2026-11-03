import { env } from '@/env';

import { ApiError, type ApiErrorDetail } from './api-error';

/**
 * Single fetch wrapper for the backend REST API (requirements §7).
 * - credentials: 'include' on every request (HttpOnly auth cookies, never localStorage)
 * - X-CSRF-Token (double-submit, read from the non-HttpOnly csrf_token cookie) on non-GET requests
 * - on 401: one single-flight POST /auth/refresh shared by concurrent requests, then one retry;
 *   if refresh fails -> auth-failure handler (clears query cache + redirects to login)
 * - unwraps the { success, data, meta } envelope and normalizes errors into ApiError
 */

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'X-CSRF-Token';
const REFRESH_PATH = '/auth/refresh';
/** Auth endpoints whose 401 means "bad credentials", not "expired access token". */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register'];

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryValue = string | number | boolean | null | undefined;

export type ApiMeta = {
  pagination?: { nextCursor?: string | null; page?: number; pageSize?: number; total?: number };
} & Record<string, unknown>;

export type ApiResult<T> = { data: T; meta: ApiMeta | undefined; status: number };

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue | QueryValue[]>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Extra non-2xx statuses whose success envelope should be returned instead of thrown (e.g. 503 health). */
  acceptStatuses?: number[];
  /** Internal: prevents refresh loops. */
  skipRefresh?: boolean;
  /** Next.js fetch cache options for server-side calls. */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
};

type SuccessEnvelope<T> = { success: true; data: T; meta?: ApiMeta };
type ErrorEnvelope = {
  success: false;
  error: { code: string; message: string; details?: ApiErrorDetail[]; requestId?: string };
};

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------------------------------------------------------------------------
// Auth failure handler (registered by <Providers>, so this module stays React-free)
// ---------------------------------------------------------------------------
let onAuthFailure: (() => void) | undefined;

export function setAuthFailureHandler(handler: (() => void) | undefined): void {
  onAuthFailure = handler;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function readCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return undefined;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!path.startsWith('/')) throw new Error(`API path must start with "/": ${path}`);
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${path}`);
  if (query) {
    for (const [key, raw] of Object.entries(query)) {
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

function isSuccessEnvelope<T>(body: unknown): body is SuccessEnvelope<T> {
  return (
    typeof body === 'object' && body !== null && (body as { success?: unknown }).success === true
  );
}

function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as { success?: unknown; error?: unknown };
  return (
    candidate.success === false &&
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof (candidate.error as { code?: unknown }).code === 'string'
  );
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const requestId = response.headers.get('x-request-id') ?? undefined;
  if (isErrorEnvelope(body)) {
    return new ApiError(response.status, body.error.code, body.error.message, {
      details: body.error.details,
      requestId: body.error.requestId ?? requestId,
    });
  }
  return new ApiError(
    response.status,
    'UNEXPECTED_RESPONSE',
    `Request failed with status ${response.status}`,
    {
      requestId,
    },
  );
}

// ---------------------------------------------------------------------------
// Single-flight refresh
// ---------------------------------------------------------------------------
let refreshPromise: Promise<boolean> | undefined;

function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const csrf = readCookie(CSRF_COOKIE);
      const response = await fetch(buildUrl(REFRESH_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', ...(csrf ? { [CSRF_HEADER]: csrf } : {}) },
      });
      return response.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = undefined;
  });
  return refreshPromise;
}

/** Test-only: reset module state between tests. */
export function __resetApiClientState(): void {
  refreshPromise = undefined;
  onAuthFailure = undefined;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (method !== 'GET') {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  const init: RequestInit & { next?: RequestOptions['next'] } = {
    method,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.cache ? { cache: options.cache } : {}),
    ...(options.next ? { next: options.next } : {}),
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.', {
      cause: error,
    });
  }

  const canRefresh =
    response.status === 401 &&
    isBrowser() &&
    !options.skipRefresh &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

  if (canRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) return apiRequest<T>(path, { ...options, skipRefresh: true });
    onAuthFailure?.();
  }

  const parsed = await parseBody(response);
  const accepted = response.ok || (options.acceptStatuses?.includes(response.status) ?? false);

  if (accepted && isSuccessEnvelope<T>(parsed)) {
    return { data: parsed.data, meta: parsed.meta, status: response.status };
  }
  if (response.status === 204) {
    return { data: undefined as T, meta: undefined, status: 204 };
  }
  throw toApiError(response, parsed);
}

export const apiClient = {
  get: async <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    (await apiRequest<T>(path, { ...options, method: 'GET' })).data,
  post: async <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ) => (await apiRequest<T>(path, { ...options, method: 'POST', body })).data,
  put: async <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ) => (await apiRequest<T>(path, { ...options, method: 'PUT', body })).data,
  patch: async <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ) => (await apiRequest<T>(path, { ...options, method: 'PATCH', body })).data,
  delete: async <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    (await apiRequest<T>(path, { ...options, method: 'DELETE' })).data,
};
