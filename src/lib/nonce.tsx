'use client';

import { setNonce } from 'get-nonce';
import { createContext, useContext, type ReactNode } from 'react';

const NonceContext = createContext<string | undefined>(undefined);

/**
 * Makes the per-request CSP nonce (set by src/proxy.ts) available to client libraries that inject
 * <style> tags: Radix (react-style-singleton via get-nonce) and input-otp. Without it, the strict
 * production CSP would block those styles.
 */
export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string | undefined;
  children: ReactNode;
}) {
  if (nonce && typeof window !== 'undefined') setNonce(nonce);
  return <NonceContext value={nonce}>{children}</NonceContext>;
}

export const useNonce = (): string | undefined => useContext(NonceContext);
