import { queryOptions } from '@tanstack/react-query';

import { healthKeys } from '@/lib/query-keys';

import { getHealth } from './api';

/** Shared by the server prefetch and the client hook (requirements §7). */
export const healthQueryOptions = () =>
  queryOptions({
    queryKey: healthKeys.status(),
    queryFn: ({ signal }) => getHealth(signal),
    staleTime: 15_000,
  });
