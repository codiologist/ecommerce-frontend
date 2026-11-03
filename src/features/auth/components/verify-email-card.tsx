'use client';

import Link from 'next/link';

import { FormAlert } from '@/components/shared/form-alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/form-errors';

import { useVerifyEmail } from '../mutations';

/**
 * Verification needs an explicit click: email security scanners often prefetch links, which would
 * otherwise consume the single-use token before the user sees it.
 */
export function VerifyEmailCard({ token }: { token: string | null }) {
  const verify = useVerifyEmail();

  if (!token)
    return (
      <FormAlert message="This verification link is incomplete. Request a new one from your account page." />
    );

  if (verify.isSuccess) {
    return (
      <div className="grid gap-4">
        <FormAlert tone="success" message="Your email address is verified." />
        <Button asChild>
          <Link href="/account">Go to my account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">Confirm that this is your email address.</p>
      <FormAlert message={verify.isError ? errorMessage(verify.error) : undefined} />
      <Button
        onClick={() => {
          verify.mutate(token);
        }}
        disabled={verify.isPending}
      >
        {verify.isPending ? 'Verifying…' : 'Verify my email'}
      </Button>
    </div>
  );
}
