import { dehydrate, HydrationBoundary, noop } from '@tanstack/react-query';

import { ApiStatus } from '@/features/health/components/api-status';
import { healthQueryOptions } from '@/features/health/queries';
import { getQueryClient } from '@/lib/query-client';

/**
 * Phase 0 placeholder home page. Demonstrates the SEO data pattern used from Phase 3 on:
 * server prefetch with the same queryOptions as the client, then HydrationBoundary (requirements §7).
 */
export default async function HomePage() {
  const queryClient = getQueryClient();
  // Errors are swallowed here; the client component renders the error state itself.
  await queryClient.query(healthQueryOptions()).catch(noop);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Store</h1>
      <p className="text-muted-foreground">
        Storefront coming soon. This page checks the connection to the backend API.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ApiStatus />
      </HydrationBoundary>
    </main>
  );
}
