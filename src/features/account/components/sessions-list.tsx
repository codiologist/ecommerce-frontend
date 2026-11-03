'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { FormAlert } from '@/components/shared/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLogoutAll, useRevokeSession } from '@/features/auth/mutations';
import { sessionsQueryOptions } from '@/features/auth/queries';
import type { ActiveSession } from '@/features/auth/types';
import { errorMessage } from '@/lib/form-errors';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Very small, dependency-free UA summary for display only. */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = userAgent.includes('Edg/')
    ? 'Edge'
    : userAgent.includes('OPR/')
      ? 'Opera'
      : userAgent.includes('Chrome/')
        ? 'Chrome'
        : userAgent.includes('Firefox/')
          ? 'Firefox'
          : userAgent.includes('Safari/')
            ? 'Safari'
            : 'Browser';
  const os = userAgent.includes('Android')
    ? 'Android'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : userAgent.includes('Mac OS X')
        ? 'macOS'
        : userAgent.includes('Windows')
          ? 'Windows'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

function SessionRow({ session }: { session: ActiveSession }) {
  const revoke = useRevokeSession();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="grid gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {describeDevice(session.userAgent)}
          {session.current ? <Badge variant="secondary">This device</Badge> : null}
        </span>
        <span className="text-muted-foreground text-xs">
          {session.ip ?? 'Unknown IP'} · last active{' '}
          {dateFormat.format(new Date(session.lastUsedAt))}
        </span>
        {revoke.isError ? (
          <span className="text-destructive text-xs">{errorMessage(revoke.error)}</span>
        ) : null}
      </div>
      {!session.current ? (
        <Button
          variant="outline"
          size="sm"
          disabled={revoke.isPending}
          onClick={() => {
            revoke.mutate(session.id);
          }}
        >
          {revoke.isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      ) : null}
    </li>
  );
}

export function SessionsList() {
  const router = useRouter();
  const sessions = useQuery(sessionsQueryOptions());
  const logoutAll = useLogoutAll();

  return (
    <div className="grid gap-4">
      {sessions.isPending ? (
        <p className="text-muted-foreground text-sm">Loading sessions…</p>
      ) : null}
      <FormAlert message={sessions.isError ? errorMessage(sessions.error) : undefined} />
      {sessions.data ? (
        <ul className="divide-y" aria-label="Active sessions">
          {sessions.data.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      ) : null}
      <FormAlert message={logoutAll.isError ? errorMessage(logoutAll.error) : undefined} />
      <div>
        <Button
          variant="destructive"
          disabled={logoutAll.isPending}
          onClick={() => {
            logoutAll.mutate(undefined, {
              onSuccess: () => {
                router.replace('/login');
              },
            });
          }}
        >
          {logoutAll.isPending ? 'Signing out…' : 'Log out of all devices'}
        </Button>
      </div>
    </div>
  );
}
