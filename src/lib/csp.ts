/** Request header carrying the per-request nonce from the proxy to server components. */
export const NONCE_HEADER = 'x-nonce';

export type CspOptions = {
  nonce: string;
  apiOrigin: string;
  isDev: boolean;
  /** Only when the site itself is served over https (otherwise local `next start` breaks). */
  upgradeInsecure: boolean;
};

/**
 * Strict, nonce-based Content-Security-Policy (requirements §4.3).
 * Third-party origins (payment gateways, image CDN) are added in the phase that needs them.
 */
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

export function buildCsp({ nonce, apiOrigin, isDev, upgradeInsecure }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Ignored by browsers that support 'strict-dynamic'; fallback for older ones (Turnstile, §3).
      TURNSTILE_ORIGIN,
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
    'frame-src': [TURNSTILE_ORIGIN],
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
