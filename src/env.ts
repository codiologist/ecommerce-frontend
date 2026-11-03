import { z } from 'zod';

/**
 * Public, browser-visible configuration. NEVER add secrets here (requirements §4.3):
 * every NEXT_PUBLIC_* value is inlined into the client bundle.
 * Each variable must be referenced literally (process.env.NEXT_PUBLIC_X) so Next.js can inline it.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .url()
    .refine((value) => !value.endsWith('/'), 'must not end with a slash')
    .refine((value) => /^https?:\/\//.test(value), 'must be http(s)'),
  NEXT_PUBLIC_SITE_URL: z
    .url()
    .refine((value) => !value.endsWith('/'), 'must not end with a slash'),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid public environment configuration:\n${issues}`);
  }
  return result.data;
}

export const env: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
