/**
 * Device identity for the token endpoint's `X-Device-Id` / `X-Device-Name`
 * headers (Authentication.md, "Signing in").
 *
 * The backend keys `user_sessions` off `X-Device-Id`: reusing the same id on
 * every sign-in from this browser replaces that device's session instead of
 * accumulating a new one per page load, and lets `MaxConcurrentSessions`
 * eviction and the "Sessions" screen behave sensibly. The id itself is not a
 * secret — it identifies the installation, not the user — so plain
 * localStorage is fine, unlike the refresh token.
 */
const DEVICE_ID_KEY = 'steelforce.device-id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Storage disabled (private mode, quota) — fall back to a per-tab id
    // rather than failing sign-in over a non-essential header.
    return crypto.randomUUID();
  }
}

/** Best-effort, human-readable label — never parsed, only shown to the user. */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Server';
  const ua = window.navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS - Web';
  if (/Android/.test(ua)) return 'Android - Web';
  if (/Macintosh/.test(ua)) return 'Mac - Web';
  if (/Windows/.test(ua)) return 'Windows - Web';
  return 'Web';
}
