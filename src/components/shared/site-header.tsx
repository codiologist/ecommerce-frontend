import Link from 'next/link';

import { AccountMenu } from '@/features/auth/components/account-menu';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Store
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
