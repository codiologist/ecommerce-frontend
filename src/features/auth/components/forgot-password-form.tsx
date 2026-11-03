'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { applyServerErrors } from '@/lib/form-errors';

import { useForgotPassword } from '../mutations';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await forgot.mutateAsync(email);
    } catch (error) {
      applyServerErrors(error, form.setError, ['email']);
    }
  });

  if (forgot.isSuccess) {
    return <FormAlert tone="success" message={forgot.data.message} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Reset password request">
      <FormAlert message={errors.root?.server?.message} />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...form.register('email')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner aria-hidden="true" /> : null}
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
