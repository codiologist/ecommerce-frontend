'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export function OtpField({
  id,
  label = 'Authentication code',
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputOTP
        id={id}
        maxLength={6}
        inputMode="numeric"
        pattern="^[0-9]*$"
        autoComplete="one-time-code"
        value={value}
        onChange={onChange}
        {...(autoFocus ? { autoFocus } : {})}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}
