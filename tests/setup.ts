import '@testing-library/jest-dom/vitest';

// jsdom lacks elementFromPoint (used by input-otp for password-manager detection).
if (typeof document !== 'undefined' && !('elementFromPoint' in document)) {
  Object.defineProperty(document, 'elementFromPoint', { value: () => null, configurable: true });
}
