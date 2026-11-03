'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/features/account/components/profile-form';
import { useRequiredUser } from '@/features/auth/components/auth-guard';

export function ProfileSection() {
  const user = useRequiredUser();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Profile</h1>
        </CardTitle>
        <CardDescription>Your personal details.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm key={user.id} user={user} />
      </CardContent>
    </Card>
  );
}
