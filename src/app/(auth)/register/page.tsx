import Link from 'next/link';

import { AuthCard } from '@/components/shared/auth-card';
import { RegisterForm } from '@/features/auth/components/register-form';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create account"
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/login" className="text-foreground font-medium underline underline-offset-4">
            Log in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
