import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { makeQueryClient, shouldRetry } from '@/lib/query-client';
import { healthKeys } from '@/lib/query-keys';

describe('shouldRetry', () => {
  it('never retries 4xx errors', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(shouldRetry(0, new ApiError(status, 'X', 'x'))).toBe(false);
    }
  });

  it('retries 5xx and network errors up to twice', () => {
    const serverError = new ApiError(500, 'INTERNAL_ERROR', 'x');
    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, serverError)).toBe(true);
    expect(shouldRetry(2, serverError)).toBe(false);
    expect(shouldRetry(0, new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(true);
  });
});

describe('makeQueryClient', () => {
  it('uses the agreed defaults', () => {
    const defaults = makeQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });
});

describe('query keys', () => {
  it('are hierarchical so invalidating "all" covers children', () => {
    expect(healthKeys.status().slice(0, healthKeys.all.length)).toEqual([...healthKeys.all]);
  });
});
