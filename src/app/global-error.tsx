'use client';

// Replaces the root layout when it crashes, so it renders its own <html>/<body>.
// No inline style attributes: the production CSP (style-src with nonce) would block them.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>Please refresh the page or try again later.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
