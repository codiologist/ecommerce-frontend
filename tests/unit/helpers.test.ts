import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { applyServerErrors, errorMessage } from '@/lib/form-errors';
import { safeNextPath } from '@/lib/safe-redirect';

describe('safeNextPath (no open redirects)', () => {
  it.each([
    ['/account/security', '/account/security'],
    ['/admin?tab=x#y', '/admin?tab=x#y'],
    ['%2Faccount', '/account'],
  ])('allows same-site path %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '%2F%2Fevil.com',
    'javascript:alert(1)',
    '/\u0000/evil',
    'account',
    '/login',
    '/register?x=1',
    '%E0%A4%A',
  ])('rejects %s', (input) => {
    expect(safeNextPath(input)).toBe('/account');
  });

  it('uses the fallback for empty values', () => {
    expect(safeNextPath(null, '/')).toBe('/');
  });
});

describe('applyServerErrors', () => {
  it('maps backend body.<field> details onto form fields', () => {
    const setError = vi.fn();
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Validation failed', {
      details: [{ path: 'body.password', message: 'This password is too common' }],
    });
    applyServerErrors(error, setError, ['email', 'password']);
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'This password is too common',
    });
  });

  it('falls back to a form-level error', () => {
    const setError = vi.fn();
    applyServerErrors(new ApiError(409, 'CONFLICT', 'Already exists'), setError, ['email']);
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Already exists',
    });
  });

  it('never shows raw 5xx messages', () => {
    expect(errorMessage(new ApiError(500, 'INTERNAL_ERROR', 'stack trace here'))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(errorMessage(new ApiError(0, 'NETWORK_ERROR', 'x'))).toMatch(/reach the server/);
  });
});
