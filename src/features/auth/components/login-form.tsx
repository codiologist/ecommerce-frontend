'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { isApiError } from '@/lib/api-error';
import { errorMessage } from '@/lib/form-errors';

import { useLogin, useLoginTwoFactor } from '../mutations';
import { loginSchema, type LoginValues } from '../schemas';

import { OtpField } from './otp-field';
import { DEV_CAPTCHA_TOKEN, turnstileEnabled, TurnstileWidget } from './turnstile-widget';

import type { User } from '../types';

type Props = { onSuccess: (user: User) => void };

export function LoginForm({ onSuccess }: Props) {
  const [challengeId, setChallengeId] = useState<string | null>(null);

  if (challengeId) {
    return (
      <TwoFactorStep
        challengeId={challengeId}
        onSuccess={onSuccess}
        onRestart={() => {
          setChallengeId(null);
        }}
      />
    );
  }
  return <CredentialsStep onSuccess={onSuccess} onTwoFactor={setChallengeId} />;
}

function CredentialsStep({
  onSuccess,
  onTwoFactor,
}: {
  onSuccess: (user: User) => void;
  onTwoFactor: (challengeId: string) => void;
}) {
  const login = useLogin();
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const [captchaKey, setCaptchaKey] = useState(0);
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    const turnstileToken = captchaRequired
      ? turnstileEnabled
        ? captchaToken
        : DEV_CAPTCHA_TOKEN
      : undefined;
    if (captchaRequired && !turnstileToken) {
      setFormError('Please complete the CAPTCHA.');
      return;
    }
    try {
      const result = await login.mutateAsync({
        ...values,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      if (result.twoFactorRequired) onTwoFactor(result.challengeId);
      else onSuccess(result.user);
    } catch (error) {
      if (isApiError(error) && error.code === 'CAPTCHA_REQUIRED') {
        setCaptchaRequired(true);
        setFormError('Too many failed attempts. Please complete the CAPTCHA and try again.');
      } else {
        setFormError(errorMessage(error));
      }
      // Turnstile tokens are single-use: render a fresh widget for the next attempt.
      setCaptchaToken(undefined);
      setCaptchaKey((k) => k + 1);
      form.resetField('password');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Log in">
      <FormAlert message={formError} />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...form.register('email')}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot password?
        </Link>
      </div>
      {captchaRequired ? <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} /> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner aria-hidden="true" /> : null}
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}

function TwoFactorStep({
  challengeId,
  onSuccess,
  onRestart,
}: {
  challengeId: string;
  onSuccess: (user: User) => void;
  onRestart: () => void;
}) {
  const loginTwoFactor = useLoginTwoFactor();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [expired, setExpired] = useState(false);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const value = code.trim();
    if (useBackupCode ? value.length < 10 : !/^\d{6}$/.test(value)) {
      setError(useBackupCode ? 'Enter a backup code.' : 'Enter the 6-digit code.');
      return;
    }
    try {
      const result = await loginTwoFactor.mutateAsync({
        challengeId,
        ...(useBackupCode ? { backupCode: value } : { code: value }),
      });
      if (!result.twoFactorRequired) onSuccess(result.user);
    } catch (err) {
      if (isApiError(err) && err.code === 'TWO_FACTOR_CHALLENGE_INVALID') setExpired(true);
      setError(errorMessage(err));
      setCode('');
    }
  }

  if (expired) {
    return (
      <div className="grid gap-4">
        <FormAlert message="Your sign-in attempt expired. Please log in again." />
        <Button onClick={onRestart}>Back to login</Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className="grid gap-4"
      aria-label="Two-factor verification"
    >
      <p className="text-muted-foreground text-sm">
        {useBackupCode
          ? 'Enter one of your backup codes. Each code works once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>
      <FormAlert message={error} />
      {useBackupCode ? (
        <FormField
          id="backup-code"
          label="Backup code"
          className="font-mono"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
        />
      ) : (
        <OtpField id="totp-code" value={code} onChange={setCode} autoFocus />
      )}
      <Button type="submit" disabled={loginTwoFactor.isPending}>
        {loginTwoFactor.isPending ? <Spinner aria-hidden="true" /> : null}
        {loginTwoFactor.isPending ? 'Verifying…' : 'Verify'}
      </Button>
      <Button
        type="button"
        variant="link"
        onClick={() => {
          setUseBackupCode((v) => !v);
          setCode('');
          setError(undefined);
        }}
      >
        {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code'}
      </Button>
    </form>
  );
}
