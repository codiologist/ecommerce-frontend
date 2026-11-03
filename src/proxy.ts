import { NextResponse, type NextRequest } from 'next/server';

import { buildCsp, generateNonce } from '@/lib/csp';

export const NONCE_HEADER = 'x-nonce';

/**
 * Next.js 16 route proxy (formerly middleware).
 * Phase 0: per-request CSP nonce only. Optimistic auth redirects are added in Phase 1 —
 * they are a UX convenience, never a security boundary (requirements §3).
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    apiOrigin: new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').origin,
    isDev: process.env.NODE_ENV === 'development',
    upgradeInsecure: (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'),
  });

  // Next.js reads the CSP from the request headers to apply the nonce to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Skip static assets and prefetches (they don't render HTML).
      source:
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
