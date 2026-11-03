import { describe, expect, it } from 'vitest';

import { parsePublicEnv } from '@/env';

const valid = {
  NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
};

describe('parsePublicEnv', () => {
  it('accepts a valid config and treats empty optional values as undefined', () => {
    const env = parsePublicEnv({ ...valid, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' });
    expect(env.NEXT_PUBLIC_API_URL).toBe(valid.NEXT_PUBLIC_API_URL);
    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined();
  });

  it('fails when the API URL is missing or invalid', () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_API_URL: undefined })).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_API_URL: 'not a url' })).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
  });

  it('rejects a trailing slash (paths are joined as base + "/path")', () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1/' }),
    ).toThrow(/slash/);
  });
});
