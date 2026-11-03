import { queryOptions, useQuery } from '@tanstack/react-query';

import { adminKeys, authKeys } from '@/lib/query-keys';

import { accountApi, adminApi, getMe } from './api';

export const meQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true, // pick up logouts/role changes from other tabs
  });

export const sessionsQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.sessions(),
    queryFn: ({ signal }) => accountApi.listSessions(signal),
  });

export const adminSessionQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.session(),
    queryFn: ({ signal }) => adminApi.session(signal),
    retry: false,
  });

/** The logged-in user, or null. Auth state lives in the query cache (never in Zustand/localStorage). */
export function useMe() {
  return useQuery(meQueryOptions());
}
