'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { setAuthFailureHandler } from '@/lib/api-client';
import { getQueryClient } from '@/lib/query-client';

// Devtools are loaded only in development and never shipped to production (requirements §7).
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools))
    : () => null;

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const router = useRouter();

  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.clear();
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    });
    return () => {
      setAuthFailureHandler(undefined);
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
