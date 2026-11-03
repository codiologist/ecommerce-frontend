import { AuthCard } from '@/components/shared/auth-card';
import { VerifyEmailCard } from '@/features/auth/components/verify-email-card';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Verify email' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Verify your email">
      <VerifyEmailCard token={typeof token === 'string' ? token : null} />
    </AuthCard>
  );
}
