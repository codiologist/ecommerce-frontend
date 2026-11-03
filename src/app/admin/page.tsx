import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

/** Placeholder: the dashboard is built in Phase 8. */
export default function AdminHomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        You&apos;re signed in to the admin panel. Catalog management arrives in Phase 2.
      </p>
    </>
  );
}
