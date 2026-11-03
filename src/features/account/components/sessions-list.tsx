'use client';

import { useQuery } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { FormAlert } from '@/components/shared/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
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
    <Item variant="outline" role="listitem">
      <ItemMedia variant="icon">
        <MonitorSmartphone aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {describeDevice(session.userAgent)}
          {session.current ? <Badge variant="secondary">This device</Badge> : null}
        </ItemTitle>
        <ItemDescription>
          {session.ip ?? 'Unknown IP'} · last active{' '}
          {dateFormat.format(new Date(session.lastUsedAt))}
        </ItemDescription>
        {revoke.isError ? (
          <span className="text-destructive text-xs">{errorMessage(revoke.error)}</span>
        ) : null}
      </ItemContent>
      {!session.current ? (
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            disabled={revoke.isPending}
            onClick={() => {
              revoke.mutate(session.id);
            }}
          >
            {revoke.isPending ? <Spinner aria-hidden="true" /> : null}
            {revoke.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </ItemActions>
      ) : null}
    </Item>
  );
}

export function SessionsList() {
  const router = useRouter();
  const sessions = useQuery(sessionsQueryOptions());
  const logoutAll = useLogoutAll();

  return (
    <div className="grid gap-4">
      {sessions.isPending ? (
        <div className="grid gap-3" aria-label="Loading sessions">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      <FormAlert message={sessions.isError ? errorMessage(sessions.error) : undefined} />
      {sessions.data ? (
        <ItemGroup aria-label="Active sessions" className="gap-3">
          {sessions.data.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ItemGroup>
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
          {logoutAll.isPending ? <Spinner aria-hidden="true" /> : null}
          {logoutAll.isPending ? 'Signing out…' : 'Log out of all devices'}
        </Button>
      </div>
    </div>
  );
}
