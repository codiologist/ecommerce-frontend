'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { applyServerErrors } from '@/lib/form-errors';

import { useResetPassword } from '../mutations';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const reset = useResetPassword();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (!token) {
    return (
      <div className="grid gap-4">
        <FormAlert message="This reset link is incomplete or invalid." />
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await reset.mutateAsync({ token, password });
    } catch (error) {
      applyServerErrors(error, form.setError, ['password']);
    }
  });

  if (reset.isSuccess) {
    return (
      <div className="grid gap-4">
        <FormAlert tone="success" message={reset.data.message} />
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Set a new password">
      <FormAlert message={errors.root?.server?.message} />
      <FormField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        autoFocus
        hint="At least 8 characters. Avoid common passwords."
        error={errors.password?.message}
        {...form.register('password')}
      />
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Set new password'}
      </Button>
      <p className="text-muted-foreground text-xs">You&apos;ll be signed out on all devices.</p>
    </form>
  );
}
