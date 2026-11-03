import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { ComponentProps, ReactNode } from 'react';

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
};

/**
 * shadcn Field + Input with an accessible error message
 * (programmatic label, aria-invalid, aria-describedby → description/error).
 */
export function FormField({ id, label, error, hint, ...inputProps }: FormFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && !error ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
      <FieldError id={`${id}-error`} errors={error ? [{ message: error }] : undefined} />
    </Field>
  );
}
