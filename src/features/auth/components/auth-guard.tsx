'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { FormAlert } from '@/components/shared/form-alert';
import { PageLoading } from '@/components/shared/page-status';
import { errorMessage } from '@/lib/form-errors';

import { useMe } from '../queries';

import type { User } from '../types';

/**
 * Client-side guard for logged-in areas. UX only: every protected API route is enforced by the
 * backend (requirements §3). Renders children only once the user is known.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (me.data === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.data, pathname, router]);

  if (me.isError)
    return (
      <div className="p-6">
        <FormAlert message={errorMessage(me.error)} />
      </div>
    );
  if (!me.data) return <PageLoading />;
  return children;
}

/** For components rendered inside <RequireAuth>: the user is guaranteed to be loaded. */
export function useRequiredUser(): User {
  const { data } = useMe();
  if (!data) throw new Error('useRequiredUser must be used inside <RequireAuth>');
  return data;
}
