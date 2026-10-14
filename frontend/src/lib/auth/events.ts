/**
 * Cross-component signal for session changes.
 *
 * The header lives in the root layout and survives client-side navigation, so a
 * sign-in or sign-out performed by a page cannot re-run the header's session
 * fetch by itself. Dispatching a window event keeps the two decoupled: pages
 * announce the change, the header (and anything else) listens.
 */

const AUTH_EVENT = 'staynearby:auth-changed';

export function notifyAuthChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

/** Subscribe to session changes; returns an unsubscribe function. */
export function onAuthChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}
