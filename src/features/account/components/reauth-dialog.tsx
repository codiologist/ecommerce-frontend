'use client';

import { useState } from 'react';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OtpField } from '@/features/auth/components/otp-field';
import { useReauth } from '@/features/auth/mutations';
import { errorMessage } from '@/lib/form-errors';

/** Confirms identity (password + 2FA code if enabled) before a sensitive action (requirements §3). */
export function ReauthDialog({
  open,
  onOpenChange,
  requireCode,
  title,
  description,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requireCode: boolean;
  title: string;
  description: string;
  onConfirmed: () => void;
}) {
  const reauth = useReauth();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (requireCode && !/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    try {
      await reauth.mutateAsync({ password, ...(requireCode ? { code } : {}) });
      setPassword('');
      setCode('');
      onConfirmed();
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FormAlert message={error} />
          <FormField
            id="reauth-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          {requireCode ? <OtpField id="reauth-code" value={code} onChange={setCode} /> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={reauth.isPending}>
              {reauth.isPending ? 'Checking…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
