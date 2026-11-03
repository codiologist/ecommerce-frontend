export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
