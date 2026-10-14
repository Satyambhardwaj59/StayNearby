/**
 * Sanitise a post-login redirect target.
 *
 * `?next=` arrives from the URL, so it is attacker-controllable. Only same-site
 * relative paths are allowed — protocol-relative (`//evil.com`), absolute URLs,
 * backslashes (which some browsers normalise to `/`) and any scheme such as
 * `javascript:` all fall back to the default.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) {
    return fallback;
  }

  const value = next.trim();
  if (value.length === 0 || !value.startsWith('/')) {
    return fallback;
  }
  if (value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  // Control characters can hide a second URL from simple checks.
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) {
      return fallback;
    }
  }

  return value;
}
