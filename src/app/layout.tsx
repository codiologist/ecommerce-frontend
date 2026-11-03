import { headers } from 'next/headers';

import { env } from '@/env';
import { NONCE_HEADER } from '@/lib/csp';

import { Providers } from './providers';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: 'Store', template: '%s | Store' },
  description: 'Online store',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request CSP nonce from src/proxy.ts, handed to client libraries that inject <style> tags.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
