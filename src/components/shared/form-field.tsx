import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { ComponentProps, ReactNode } from 'react';

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
};

/** Label + input + accessible error message (WCAG: programmatic label, aria-invalid, aria-describedby). */
export function FormField({ id, label, error, hint, ...inputProps }: FormFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
