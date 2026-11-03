import { AuthCard } from '@/components/shared/auth-card';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reset password' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Set a new password">
      <ResetPasswordForm token={typeof token === 'string' ? token : null} />
    </AuthCard>
  );
}
