import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import type { User } from '@/features/auth/types';

import type { ReactElement } from 'react';

export const API = 'http://localhost:4000/api/v1';

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
export const ok = (data: unknown, status = 200) => json(status, { success: true, data });
export const fail = (status: number, code: string, message = code, details?: unknown) =>
  json(status, { success: false, error: { code, message, ...(details ? { details } : {}) } });

type Handler = (body: unknown) => Response | Promise<Response>;

/**
 * Routes fetch calls by "METHOD /path" (path relative to the API base). Unmatched calls fail the test.
 * GET /auth/csrf is answered automatically.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = [];
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(API, '').split('?')[0] ?? '';
    const key = `${init?.method ?? 'GET'} ${path}`;
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({ key, body });
    if (key === 'GET /auth/csrf') {
      document.cookie = 'csrf_token=test-csrf; path=/';
      return Promise.resolve(ok({ csrfToken: 'test-csrf' }));
    }
    const handler = routes[key];
    if (!handler) return Promise.reject(new Error(`Unexpected request: ${key}`));
    return Promise.resolve(handler(body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    fetchMock,
    calls,
    bodiesFor: (key: string) => calls.filter((c) => c.key === key).map((c) => c.body),
  };
}

export function renderWithClient(ui: ReactElement, client = makeTestClient()) {
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

export function makeTestClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export const testUser = (overrides: Partial<User> = {}): User => ({
  id: '0b5c2f2e-3f0d-4c3c-9d7e-1a2b3c4d5e6f',
  email: 'jane@example.com',
  name: 'Jane Doe',
  phone: null,
  role: 'CUSTOMER',
  emailVerified: true,
  twoFactorEnabled: false,
  createdAt: '2026-11-03T10:00:00.000Z',
  ...overrides,
});
