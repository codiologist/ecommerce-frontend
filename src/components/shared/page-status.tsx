import { Spinner } from '@/components/ui/spinner';

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2 text-sm">
      <Spinner aria-label={label} />
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
