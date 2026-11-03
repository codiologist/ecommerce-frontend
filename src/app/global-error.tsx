'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import './globals.css';

// Replaces the root layout when it crashes, so it renders its own <html>/<body> (and imports the CSS).
// Never render error.message: it may contain internals.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                <h1 className="text-xl">Something went wrong</h1>
              </CardTitle>
              <CardDescription>Please refresh the page or try again later.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={reset}>Try again</Button>
            </CardContent>
          </Card>
        </main>
      </body>
    </html>
  );
}
