import Link from 'next/link';
import { Suspense } from 'react';

import { AuthCard } from '@/components/shared/auth-card';

import { LoginView } from './login-view';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in"
      description="Welcome back."
      footer={
        <p>
          New here?{' '}
          <Link
            href="/register"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <Suspense>
        <LoginView />
      </Suspense>
    </AuthCard>
  );
}
