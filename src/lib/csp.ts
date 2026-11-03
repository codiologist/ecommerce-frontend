export type CspOptions = {
  nonce: string;
  apiOrigin: string;
  isDev: boolean;
  /** Only when the site itself is served over https (otherwise local `next start` breaks). */
  upgradeInsecure: boolean;
};

/**
 * Strict, nonce-based Content-Security-Policy (requirements §4.3).
 * Third-party origins (Turnstile, payment gateways, image CDN) are added in the phase that needs them.
 */
export function buildCsp({ nonce, apiOrigin, isDev, upgradeInsecure }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Dev needs inline styles for HMR; production uses the nonce.
    'style-src': ["'self'", isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", apiOrigin, ...(isDev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (upgradeInsecure) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
