'use client';

import { Turnstile } from '@marsidev/react-turnstile';

import { env } from '@/env';
import { useNonce } from '@/lib/nonce';

export const turnstileEnabled = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * Sent instead of a real token when no site key is configured (local development only: the backend
 * skips verification when it has no TURNSTILE_SECRET_KEY, and production requires both keys).
 */
export const DEV_CAPTCHA_TOKEN = 'turnstile-disabled-in-development';

type Props = { onToken: (token: string | undefined) => void };

/** Cloudflare Turnstile (requirements §3). Re-mount it (change `key`) to get a fresh single-use token. */
export function TurnstileWidget({ onToken }: Props) {
  const nonce = useNonce();
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return (
      <p className="text-muted-foreground text-xs" data-testid="captcha-disabled">
        CAPTCHA is disabled in this environment.
      </p>
    );
  }
  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onToken}
      onExpire={() => {
        onToken(undefined);
      }}
      onError={() => {
        onToken(undefined);
      }}
      options={{ theme: 'auto', size: 'flexible' }}
      {...(nonce ? { scriptOptions: { nonce } } : {})}
    />
  );
}
