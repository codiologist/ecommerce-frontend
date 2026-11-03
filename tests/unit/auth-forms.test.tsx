import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { DEV_CAPTCHA_TOKEN } from '@/features/auth/components/turnstile-widget';
import { __resetApiClientState } from '@/lib/api-client';
import { authKeys } from '@/lib/query-keys';

import { fail, mockApi, ok, renderWithClient, testUser } from './test-utils';

beforeEach(() => {
  __resetApiClientState();
  document.cookie = 'csrf_token=test-csrf; path=/';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillLogin(email = 'jane@example.com', password = 'secret-password') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  return user;
}

describe('<LoginForm />', () => {
  it('validates fields on the client before calling the API', async () => {
    const api = mockApi({});
    renderWithClient(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(api.calls.filter((c) => c.key === 'POST /auth/login')).toHaveLength(0);
  });

  it('logs in, stores the user in the cache and calls onSuccess', async () => {
    const me = testUser();
    mockApi({ 'POST /auth/login': () => ok({ twoFactorRequired: false, user: me }) });
    const onSuccess = vi.fn();
    const { client } = renderWithClient(<LoginForm onSuccess={onSuccess} />);
    await fillLogin();
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(me);
    });
    expect(client.getQueryData(authKeys.me())).toEqual(me);
  });

  it('shows the generic error for wrong credentials and clears the password', async () => {
    mockApi({
      'POST /auth/login': () => fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
    });
    renderWithClient(<LoginForm onSuccess={vi.fn()} />);
    await fillLogin();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('shows the CAPTCHA after CAPTCHA_REQUIRED and sends a token on the next attempt', async () => {
    let attempts = 0;
    const api = mockApi({
      'POST /auth/login': () => {
        attempts += 1;
        return attempts === 1
          ? fail(403, 'CAPTCHA_REQUIRED', 'Please complete the CAPTCHA')
          : ok({ twoFactorRequired: false, user: testUser() });
      },
    });
    const onSuccess = vi.fn();
    renderWithClient(<LoginForm onSuccess={onSuccess} />);
    const user = await fillLogin();
    expect(await screen.findByText(/complete the CAPTCHA and try again/)).toBeInTheDocument();
    expect(screen.getByTestId('captcha-disabled')).toBeInTheDocument(); // no site key in tests

    await user.type(screen.getByLabelText('Password'), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(api.bodiesFor('POST /auth/login')[1]).toMatchObject({
      turnstileToken: DEV_CAPTCHA_TOKEN,
    });
  });

  it('asks for a 2FA code, then completes login with it', async () => {
    const me = testUser({ role: 'ADMIN', twoFactorEnabled: true });
    const api = mockApi({
      'POST /auth/login': () => ok({ twoFactorRequired: true, challengeId: 'challenge-123' }),
      'POST /auth/login/2fa': () => ok({ twoFactorRequired: false, user: me }),
    });
    const onSuccess = vi.fn();
    renderWithClient(<LoginForm onSuccess={onSuccess} />);
    const user = await fillLogin();

    expect(await screen.findByText(/6-digit code from your authenticator/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    await user.keyboard('123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(me);
    });
    expect(api.bodiesFor('POST /auth/login/2fa')[0]).toEqual({
      challengeId: 'challenge-123',
      code: '123456',
    });
  });

  it('supports backup codes and handles an expired challenge', async () => {
    mockApi({
      'POST /auth/login': () => ok({ twoFactorRequired: true, challengeId: 'challenge-123' }),
      'POST /auth/login/2fa': () => fail(401, 'TWO_FACTOR_CHALLENGE_INVALID', 'expired'),
    });
    renderWithClient(<LoginForm onSuccess={vi.fn()} />);
    const user = await fillLogin();
    await user.click(await screen.findByRole('button', { name: 'Use a backup code' }));
    await user.type(screen.getByLabelText('Backup code'), 'abcde-fghjk');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await user.click(await screen.findByRole('button', { name: 'Back to login' }));
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});

describe('<RegisterForm />', () => {
  async function fillRegister() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Full name'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
  }

  it('shows backend password-policy errors on the password field', async () => {
    mockApi({
      'POST /auth/register': () =>
        fail(422, 'VALIDATION_ERROR', 'Validation failed', [
          {
            path: 'body.password',
            message: 'This password is too common. Please choose a less predictable one',
          },
        ]),
    });
    renderWithClient(<RegisterForm />);
    await fillRegister();
    expect(await screen.findByText(/too common/)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the generic "check your email" result', async () => {
    const api = mockApi({
      'POST /auth/register': () =>
        ok({ message: 'Account created. Check your email to verify your address.' }, 201),
    });
    renderWithClient(<RegisterForm />);
    await fillRegister();
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(api.bodiesFor('POST /auth/register')[0]).not.toHaveProperty('confirmPassword');
  });

  it('catches mismatched passwords client-side', async () => {
    renderWithClient(<RegisterForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Password'), 'password-one');
    await user.type(screen.getByLabelText('Confirm password'), 'password-two');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });
});
