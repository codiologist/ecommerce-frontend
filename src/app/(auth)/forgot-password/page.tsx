import Link from 'next/link';

import { AuthCard } from '@/components/shared/auth-card';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to reset it."
      footer={
        <Link href="/login" className="underline underline-offset-4">
          Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
