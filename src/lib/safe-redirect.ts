const DEFAULT_AFTER_LOGIN = '/account';

/**
 * Validates a ?next= value so login can't be abused as an open redirect.
 * Only same-site absolute paths are allowed ("/account", not "//evil.com", "/\\evil.com" or "https://...").
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = DEFAULT_AFTER_LOGIN,
): string {
  if (!raw) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'http://same-origin.invalid');
    if (url.origin !== 'http://same-origin.invalid') return fallback;
    // Never bounce back to an auth page.
    if (/^\/(login|register)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
