'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

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
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
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
    </div>
  );
}
