'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { healthQueryOptions } from '@/features/health/queries';
import { cn } from '@/lib/utils';

export function ApiStatus() {
  const { data, error, isPending, isFetching, refetch } = useQuery(healthQueryOptions());

  let label: string;
  let variant: 'secondary' | 'destructive' | 'outline' = 'outline';
  let tone = '';
  if (isPending) {
    label = 'Checking API…';
    variant = 'secondary';
  } else if (error) {
    label = 'API unreachable';
    variant = 'destructive';
  } else if (data.status === 'ok') {
    label = 'API online · database up';
    tone = 'border-emerald-600/30 text-emerald-700 dark:text-emerald-400';
  } else {
    label = 'API online · database down';
    tone = 'border-amber-600/30 text-amber-700 dark:text-amber-400';
  }

  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite">
      <Badge variant={variant} className={cn('px-3 py-1 text-sm', tone)} data-testid="api-status">
        {isPending ? <Spinner aria-hidden="true" /> : null}
        {label}
      </Badge>
      <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
        {isFetching ? <Spinner aria-hidden="true" /> : null}
        {isFetching ? 'Checking…' : 'Re-check'}
      </Button>
    </div>
  );
}
