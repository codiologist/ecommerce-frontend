import { SiteHeader } from '@/components/shared/site-header';
import { RequireAuth } from '@/features/auth/components/auth-guard';

import { AccountNav } from './account-nav';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <RequireAuth>
        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 md:grid-cols-[180px_1fr]">
          <AccountNav />
          <main className="grid content-start gap-8">{children}</main>
        </div>
      </RequireAuth>
    </>
  );
}
