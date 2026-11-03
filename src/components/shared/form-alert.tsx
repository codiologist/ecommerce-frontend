import { CircleAlert, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

export function FormAlert({
  message,
  tone = 'error',
}: {
  message?: string | undefined;
  tone?: 'error' | 'success';
}) {
  if (!message) return null;
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
