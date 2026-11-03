'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormAlert } from '@/components/shared/form-alert';
import { FormField } from '@/components/shared/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useResendVerification, useUpdateProfile } from '@/features/auth/mutations';
import { profileSchema, type ProfileValues } from '@/features/auth/schemas';
import type { User } from '@/features/auth/types';
import { applyServerErrors, errorMessage } from '@/lib/form-errors';

export function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile();
  const resend = useResendVerification();
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '' },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    try {
      const updated = await update.mutateAsync({ name: values.name, phone: values.phone || null });
      form.reset({ name: updated.name, phone: updated.phone ?? '' });
      setSaved(true);
    } catch (error) {
      applyServerErrors(error, form.setError, ['name', 'phone']);
    }
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <span className="text-sm font-medium">Email</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{user.email}</span>
          {user.emailVerified ? (
            <Badge variant="secondary">Verified</Badge>
          ) : (
            <Badge variant="destructive">Not verified</Badge>
          )}
        </div>
        {!user.emailVerified ? (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm">
              Verify your email to be able to check out.
            </p>
            {resend.isSuccess ? (
              <FormAlert tone="success" message="Verification email sent. Check your inbox." />
            ) : (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resend.isPending}
                  onClick={() => {
                    resend.mutate(user.email);
                  }}
                >
                  {resend.isPending ? <Spinner aria-hidden="true" /> : null}
                  {resend.isPending ? 'Sending…' : 'Resend verification email'}
                </Button>
              </div>
            )}
            <FormAlert message={resend.isError ? errorMessage(resend.error) : undefined} />
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Profile">
        <FormAlert message={errors.root?.server?.message} />
        {saved && !isDirty ? <FormAlert tone="success" message="Profile saved." /> : null}
        <FormField
          id="name"
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <FormField
          id="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+8801XXXXXXXXX"
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Spinner aria-hidden="true" /> : null}
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
