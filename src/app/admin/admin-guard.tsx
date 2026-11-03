'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { FormAlert } from '@/components/shared/form-alert';
import { PageLoading } from '@/components/shared/page-status';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { useLogout } from '@/features/auth/mutations';
import { adminSessionQueryOptions, useMe } from '@/features/auth/queries';
import { STAFF_ROLES } from '@/features/auth/types';
import { isApiError } from '@/lib/api-error';
import { errorMessage } from '@/lib/form-errors';

const SETUP_PATH = '/admin/setup-2fa';

/**
 * Admin area guard (UX only - the backend enforces role + 2FA on every /api/v1/admin route).
 * Order: logged in → staff role → 2FA set up (else forced setup page) → 2FA verified this session.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const isStaff = me.data ? STAFF_ROLES.includes(me.data.role) : false;
  const onSetupPage = pathname === SETUP_PATH;
  const adminSession = useQuery({
    ...adminSessionQueryOptions(),
    enabled: isStaff && !onSetupPage,
  });
  const logout = useLogout();

  const setupRequired =
    isApiError(adminSession.error) && adminSession.error.code === 'TWO_FACTOR_SETUP_REQUIRED';

  useEffect(() => {
    if (me.data === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (setupRequired) router.replace(SETUP_PATH);
  }, [me.data, setupRequired, pathname, router]);

  if (me.isError)
    return (
      <Shell>
        <FormAlert message={errorMessage(me.error)} />
      </Shell>
    );
  if (!me.data) return <PageLoading />;

  if (!isStaff) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground text-sm">
          Your account doesn&apos;t have access to the admin panel.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to the store</Link>
        </Button>
      </Shell>
    );
  }

  if (onSetupPage) return <Shell>{children}</Shell>;
  if (adminSession.isPending || setupRequired) return <PageLoading />;

  if (isApiError(adminSession.error) && adminSession.error.code === 'TWO_FACTOR_REQUIRED') {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Verification required</h1>
        <p className="text-muted-foreground text-sm">
          This session hasn&apos;t been verified with two-factor authentication. Log in again and
          enter your authenticator code.
        </p>
        <div>
          <Button
            onClick={() => {
              logout.mutate(undefined, {
                onSettled: () => {
                  router.replace(`/login?next=${encodeURIComponent(pathname)}`);
                },
              });
            }}
          >
            Log in again
          </Button>
        </div>
      </Shell>
    );
  }
  if (adminSession.isError)
    return (
      <Shell>
        <FormAlert message={errorMessage(adminSession.error)} />
      </Shell>
    );

  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Store Admin
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl content-start gap-4 px-4 py-10">{children}</main>
    </div>
  );
}
