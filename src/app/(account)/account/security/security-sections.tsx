'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/account/components/change-password-form';
import { SessionsList } from '@/features/account/components/sessions-list';
import { TwoFactorSection } from '@/features/account/components/two-factor-section';
import { useRequiredUser } from '@/features/auth/components/auth-guard';

export function SecuritySections() {
  const user = useRequiredUser();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Password</h2>
          </CardTitle>
          <CardDescription>Changing it signs you out on your other devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Two-factor authentication</h2>
          </CardTitle>
          <CardDescription>
            Protect your account with a code from an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSection user={user} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Active sessions</h2>
          </CardTitle>
          <CardDescription>Devices where you&apos;re currently logged in.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsList />
        </CardContent>
      </Card>
    </>
  );
}
