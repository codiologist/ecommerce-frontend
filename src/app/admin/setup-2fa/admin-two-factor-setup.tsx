'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TwoFactorSetup } from '@/features/auth/components/two-factor-setup';
import { useMe } from '@/features/auth/queries';

export function AdminTwoFactorSetup() {
  const router = useRouter();
  const me = useMe();
  // Set once 2FA is enabled here, so the backup codes stay visible until acknowledged.
  const [justEnabled, setJustEnabled] = useState(false);
  const alreadyEnabled = me.data?.twoFactorEnabled === true && !justEnabled;

  useEffect(() => {
    if (alreadyEnabled) router.replace('/admin');
  }, [alreadyEnabled, router]);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Set up two-factor authentication</h1>
        </CardTitle>
        <CardDescription>
          Staff accounts must use two-factor authentication before they can use the admin panel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TwoFactorSetup
          onEnabled={() => {
            setJustEnabled(true);
          }}
          onDone={() => {
            router.replace('/admin');
          }}
        />
      </CardContent>
    </Card>
  );
}
