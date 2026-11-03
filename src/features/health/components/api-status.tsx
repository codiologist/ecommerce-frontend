'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { healthQueryOptions } from '@/features/health/queries';

export function ApiStatus() {
  const { data, error, isPending, isFetching, refetch } = useQuery(healthQueryOptions());

  let label: string;
  let tone: string;
  if (isPending) {
    label = 'Checking API…';
    tone = 'bg-muted text-muted-foreground';
  } else if (error) {
    label = 'API unreachable';
    tone = 'bg-destructive/10 text-destructive';
  } else if (data.status === 'ok') {
    label = 'API online · database up';
    tone = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  } else {
    label = 'API online · database down';
    tone = 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  }

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite">
      <span
        className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}
        data-testid="api-status"
      >
        {label}
      </span>
      <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
        {isFetching ? 'Checking…' : 'Re-check'}
      </Button>
    </div>
  );
}
