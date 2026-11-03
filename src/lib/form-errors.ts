import { isApiError } from './api-error';

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Maps backend validation details (path "body.<field>") onto form fields.
 * Anything not tied to a known field becomes a form-level ("root.server") error.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (isApiError(error) && error.details?.length) {
    let mapped = false;
    for (const detail of error.details) {
      const field = detail.path?.replace(/^body\./, '') as Path<T> | undefined;
      if (field && fields.includes(field)) {
        setError(field, { type: 'server', message: detail.message });
        mapped = true;
      }
    }
    if (mapped) return;
  }
  setError('root.server', { type: 'server', message: errorMessage(error) });
}

export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isApiError(error)) {
    if (error.code === 'NETWORK_ERROR') return 'Could not reach the server. Check your connection.';
    if (error.status >= 500) return fallback;
    return error.message;
  }
  return fallback;
}
