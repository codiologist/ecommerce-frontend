// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { buildCsp, generateNonce } from '@/lib/csp';
import { proxy } from '@/proxy';

describe('buildCsp', () => {
  it('is strict in production', () => {
    const csp = buildCsp({
      nonce: 'abc',
      apiOrigin: 'https://api.example.com',
      isDev: false,
      upgradeInsecure: true,
    });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('relaxes only what dev tooling needs in development', () => {
    const csp = buildCsp({
      nonce: 'abc',
      apiOrigin: 'http://localhost:4000',
      isDev: true,
      upgradeInsecure: false,
    });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});

describe('generateNonce', () => {
  it('produces unique base64 nonces of 128 bits', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
  });
});

describe('proxy', () => {
  it('sets a per-request CSP with a fresh nonce on the response and forwards the nonce', () => {
    const first = proxy(new NextRequest('http://localhost:3000/'));
    const second = proxy(new NextRequest('http://localhost:3000/'));
    const csp1 = first.headers.get('content-security-policy') ?? '';
    const csp2 = second.headers.get('content-security-policy') ?? '';
    expect(csp1).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp1).not.toBe(csp2);
    expect(csp1).toContain('http://localhost:4000');
    // Forwarded request headers are exposed by NextResponse.next() via x-middleware-request-*.
    expect(first.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
  });
});

describe('proxy optimistic auth redirects', () => {
  it.each(['/account', '/account/security', '/admin', '/admin/setup-2fa'])(
    'redirects %s to /login when there is no access cookie',
    (path) => {
      const res = proxy(new NextRequest(`http://localhost:3000${path}?tab=1`));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get('location') ?? '');
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('next')).toBe(`${path}?tab=1`);
    },
  );

  it('lets requests with an access cookie through', () => {
    const req = new NextRequest('http://localhost:3000/account', {
      headers: { cookie: 'access_token=abc' },
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-security-policy')).toContain('nonce-');
  });

  it('does not redirect public pages', () => {
    for (const path of ['/', '/login', '/accounting-terms']) {
      expect(
        proxy(new NextRequest(`http://localhost:3000${path}`)).headers.get('location'),
      ).toBeNull();
    }
  });

  it('allows Turnstile frames and scripts in the CSP', () => {
    const csp =
      proxy(new NextRequest('http://localhost:3000/login')).headers.get(
        'content-security-policy',
      ) ?? '';
    expect(csp).toContain('frame-src https://challenges.cloudflare.com');
  });
});
