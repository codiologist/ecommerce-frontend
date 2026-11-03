'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Never render error.message: it may contain internals. The digest is enough for log correlation.
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        Please try again. If the problem continues, contact support.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
