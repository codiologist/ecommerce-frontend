import { NextResponse, type NextRequest } from 'next/server';

import { buildCsp, generateNonce, NONCE_HEADER } from '@/lib/csp';

/**
 * Next.js 16 route proxy (formerly middleware).
 * - Per-request CSP nonce.
 * - Optimistic auth redirect: protected areas without an access cookie go to /login?next=… .
 *   This is a UX convenience, never a security boundary - the backend checks every request (§3).
 *   If the access cookie merely expired (refresh token still valid), the login page refreshes the
 *   session silently and sends the user straight back.
 */
const PROTECTED_PREFIXES = ['/account', '/admin'];
const ACCESS_COOKIES = ['access_token', '__Secure-access_token'];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isProtected(pathname) && !ACCESS_COOKIES.some((name) => request.cookies.has(name))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

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
