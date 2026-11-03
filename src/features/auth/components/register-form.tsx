'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { applyServerErrors } from '@/lib/form-errors';

import { useRegister } from '../mutations';
import { registerSchema, type RegisterValues } from '../schemas';

import { DEV_CAPTCHA_TOKEN, turnstileEnabled, TurnstileWidget } from './turnstile-widget';

export function RegisterForm() {
  const register = useRegister();
  const [done, setDone] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const [captchaKey, setCaptchaKey] = useState(0);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    const turnstileToken = turnstileEnabled ? captchaToken : DEV_CAPTCHA_TOKEN;
    if (!turnstileToken) {
      form.setError('root.server', { message: 'Please complete the CAPTCHA.' });
      return;
    }
    try {
      const result = await register.mutateAsync({ ...values, turnstileToken });
      setDone(result.message);
    } catch (error) {
      applyServerErrors(error, form.setError, ['name', 'email', 'password']);
      setCaptchaToken(undefined);
      setCaptchaKey((k) => k + 1);
    }
  });

  if (done) {
    return (
      <div className="grid gap-3" role="status">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          {done} If you don&apos;t see it, check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Create account">
      <FormAlert message={errors.root?.server?.message} />
      <FormField
        id="name"
        label="Full name"
        autoComplete="name"
        autoFocus
        error={errors.name?.message}
        {...form.register('name')}
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Avoid common passwords."
        error={errors.password?.message}
        {...form.register('password')}
      />
      <FormField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
