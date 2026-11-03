'use client';

import { useState } from 'react';

import { FormAlert } from '@/components/shared/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TwoFactorSetup } from '@/features/auth/components/two-factor-setup';
import { useDisableTwoFactor } from '@/features/auth/mutations';
import { STAFF_ROLES, type User } from '@/features/auth/types';
import { errorMessage } from '@/lib/form-errors';

import { ReauthDialog } from './reauth-dialog';

export function TwoFactorSection({ user }: { user: User }) {
  const disable = useDisableTwoFactor();
  const [reauthOpen, setReauthOpen] = useState(false);
  // Keeps the setup flow (and its one-time backup codes) on screen after `me` refetches as enabled.
  const [setupActive, setSetupActive] = useState(false);
  const isStaff = STAFF_ROLES.includes(user.role);

  if (!user.twoFactorEnabled || setupActive) {
    return (
      <TwoFactorSetup
        onEnabled={() => {
          setSetupActive(true);
        }}
        onDone={() => {
          setSetupActive(false);
        }}
      />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">On</Badge>
        <span className="text-muted-foreground text-sm">
          You&apos;ll be asked for a code from your authenticator app when you log in.
        </span>
      </div>
      {isStaff ? (
        <p className="text-muted-foreground text-sm">
          Two-factor authentication is required for staff accounts.
        </p>
      ) : (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setReauthOpen(true);
            }}
            disabled={disable.isPending}
          >
            Turn off two-factor authentication
          </Button>
        </div>
      )}
      <FormAlert message={disable.isError ? errorMessage(disable.error) : undefined} />
      <ReauthDialog
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        requireCode
        title="Turn off two-factor authentication"
        description="Confirm it's you. Your account will be less secure without a second factor."
        onConfirmed={() => {
          setReauthOpen(false);
          disable.mutate();
        }}
      />
    </div>
  );
}
