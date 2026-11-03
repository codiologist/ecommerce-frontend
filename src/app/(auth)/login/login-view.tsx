'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { LoginForm } from '@/features/auth/components/login-form';
import { useMe } from '@/features/auth/queries';
import { safeNextPath } from '@/lib/safe-redirect';

export function LoginView() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));
  // If the session is still valid (e.g. only the 15-min access cookie expired), skip the form.
  const me = useMe();

  useEffect(() => {
    if (me.data) router.replace(next);
  }, [me.data, next, router]);

  return (
    <LoginForm
      onSuccess={() => {
        router.replace(next);
      }}
    />
  );
}
