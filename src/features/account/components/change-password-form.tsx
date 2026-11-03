'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { useChangePassword } from '@/features/auth/mutations';
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas';
import { isApiError } from '@/lib/api-error';
import { applyServerErrors } from '@/lib/form-errors';

export function ChangePasswordForm() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      form.reset();
    } catch (error) {
      if (isApiError(error) && error.code === 'INVALID_CURRENT_PASSWORD') {
        form.setError('currentPassword', { message: error.message });
        return;
      }
      applyServerErrors(error, form.setError, ['currentPassword', 'newPassword']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Change password">
      <FormAlert message={errors.root?.server?.message} />
      {change.isSuccess && !form.formState.isDirty ? (
        <FormAlert tone="success" message="Password changed. Your other devices were signed out." />
      ) : null}
      <FormField
        id="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <FormField
        id="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Avoid common passwords."
        error={errors.newPassword?.message}
        {...form.register('newPassword')}
      />
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
