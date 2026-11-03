import { QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { describeDevice, SessionsList } from '@/features/account/components/sessions-list';
import { TwoFactorSection } from '@/features/account/components/two-factor-section';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { __resetApiClientState } from '@/lib/api-client';

import { fail, mockApi, ok, renderWithClient, testUser } from './test-utils';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/account/security',
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  __resetApiClientState();
  document.cookie = 'csrf_token=test-csrf; path=/';
  router.replace.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<AccountMenu />', () => {
  it('shows login/register links when logged out (no redirect on public pages)', async () => {
    mockApi({
      'GET /users/me': () => fail(401, 'UNAUTHORIZED'),
      'POST /auth/refresh': () => fail(401, 'REFRESH_TOKEN_INVALID'),
    });
    renderWithClient(<AccountMenu />);
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the user menu with an admin link for staff', async () => {
    mockApi({ 'GET /users/me': () => ok(testUser({ name: 'Admin Jane', role: 'ADMIN' })) });
    renderWithClient(<AccountMenu />);
    const trigger = await screen.findByRole('button', { name: 'Account menu' });
    await userEvent.setup().click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Admin panel' })).toBeInTheDocument();
  });

  it('hides the admin link for customers', async () => {
    mockApi({ 'GET /users/me': () => ok(testUser()) });
    renderWithClient(<AccountMenu />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Account menu' }));
    expect(await screen.findByRole('menuitem', { name: 'My account' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Admin panel' })).not.toBeInTheDocument();
  });
});

describe('<SessionsList />', () => {
  const sessions = [
    {
      id: 's-current',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150.0 Safari/537.36',
      ip: '10.0.0.1',
      createdAt: '2026-11-01T10:00:00Z',
      lastUsedAt: '2026-11-03T10:00:00Z',
      expiresAt: '2026-11-15T10:00:00Z',
      current: true,
    },
    {
      id: 's-phone',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile Safari/604.1',
      ip: '10.0.0.2',
      createdAt: '2026-11-02T10:00:00Z',
      lastUsedAt: '2026-11-02T12:00:00Z',
      expiresAt: '2026-11-16T10:00:00Z',
      current: false,
    },
  ];

  it('lists sessions, marks the current one and revokes another device', async () => {
    let list = sessions;
    const api = mockApi({
      'GET /users/me/sessions': () => ok(list),
      'DELETE /users/me/sessions/s-phone': () => {
        list = sessions.filter((s) => s.id !== 's-phone');
        return new Response(null, { status: 204 });
      },
    });
    renderWithClient(<SessionsList />);
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('This device')).toBeInTheDocument();
    expect(within(items[0]!).queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();

    await userEvent.setup().click(within(items[1]!).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
    expect(api.calls.filter((c) => c.key === 'GET /users/me/sessions')).toHaveLength(2); // invalidated
  });

  it('log out of all devices goes to the login page', async () => {
    mockApi({
      'GET /users/me/sessions': () => ok(sessions),
      'POST /auth/logout-all': () => new Response(null, { status: 204 }),
    });
    renderWithClient(<SessionsList />);
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Log out of all devices' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('describes devices', () => {
    expect(describeDevice(sessions[0]!.userAgent)).toBe('Chrome on macOS');
    expect(describeDevice(sessions[1]!.userAgent)).toBe('Safari on iOS');
    expect(describeDevice(null)).toBe('Unknown device');
  });
});

describe('<TwoFactorSection />', () => {
  it('sets up 2FA and keeps the one-time backup codes visible after the user refetches', async () => {
    const codes = ['abcde-fghjk', 'mnpqr-stuvw'];
    const api = mockApi({
      'POST /auth/2fa/setup': () =>
        ok({
          otpauthUri: 'otpauth://totp/Store:jane',
          qrCodeDataUrl: 'data:image/png;base64,AAAA',
          secret: 'JBSWY3DPEHPK3PXP',
        }),
      'POST /auth/2fa/enable': () => ok({ backupCodes: codes }),
      'GET /users/me': () => ok(testUser({ twoFactorEnabled: true })),
      'GET /admin/session': () => fail(403, 'FORBIDDEN'),
    });
    const { rerender, client } = renderWithClient(<TwoFactorSection user={testUser()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Set up two-factor authentication' }));
    expect(await screen.findByAltText(/QR code/)).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    );
    await user.keyboard('123456');
    await user.click(screen.getByRole('button', { name: 'Turn on two-factor authentication' }));

    const list = await screen.findByTestId('backup-codes');
    expect(list).toHaveTextContent('abcde-fghjk');
    // Parent re-renders with the refetched user (twoFactorEnabled: true): codes must stay on screen.
    rerender(
      <QueryClientProvider client={client}>
        <TwoFactorSection user={testUser({ twoFactorEnabled: true })} />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('backup-codes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    await user.click(screen.getByLabelText(/saved these codes/));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('backup-codes')).not.toBeInTheDocument();
    expect(api.bodiesFor('POST /auth/2fa/enable')[0]).toEqual({ code: '123456' });
  });

  it('staff cannot turn 2FA off; customers must re-authenticate first', async () => {
    const { unmount } = renderWithClient(
      <TwoFactorSection user={testUser({ role: 'STAFF', twoFactorEnabled: true })} />,
    );
    expect(screen.getByText(/required for staff accounts/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn off/ })).not.toBeInTheDocument();
    unmount();

    const api = mockApi({
      'POST /auth/reauth': () => new Response(null, { status: 204 }),
      'POST /auth/2fa/disable': () => new Response(null, { status: 204 }),
      'GET /users/me': () => ok(testUser()),
    });
    renderWithClient(<TwoFactorSection user={testUser({ twoFactorEnabled: true })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Turn off two-factor authentication' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Password'), 'my-password');
    await user.click(within(dialog).getByRole('textbox'));
    await user.keyboard('654321');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => {
      expect(api.calls.map((c) => c.key)).toContain('POST /auth/2fa/disable');
    });
    expect(api.bodiesFor('POST /auth/reauth')[0]).toEqual({
      password: 'my-password',
      code: '654321',
    });
  });
});
