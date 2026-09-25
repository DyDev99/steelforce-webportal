import type { Session } from '@/lib/auth/types';

const SESSION_KEY = 'steelforce.session';
const REMEMBERED_EMAIL_KEY = 'steelforce.remembered-email';

/**
 * Session persistence.
 *
 * "Remember me" decides the backing store rather than a flag inside the
 * payload: durable sessions go to localStorage, everything else to
 * sessionStorage so closing the tab ends the session.
 *
 * ── Security trade-off, stated plainly ──────────────────────────────────
 * The token endpoint (Authentication.md) returns the refresh token in the
 * response body, not as an httpOnly cookie — that's the right call for the
 * Flutter and `client_credentials` clients this API also serves, but it
 * means this web client has no choice but to hold the refresh token
 * somewhere JavaScript can read it, which is somewhere an XSS bug could read
 * it too. What limits the blast radius:
 *   - Refresh tokens are single-use with family-wide reuse detection
 *     (Authentication.md, "Refresh token rotation and reuse detection") — a
 *     stolen token is burned the moment either party uses it again.
 *   - A compromised session can be revoked immediately and specifically via
 *     `DELETE /api/v1/auth/sessions/{id}` (`sessions.revoke`), without
 *     waiting for the access token to expire.
 *   - The access token itself carries no secret, only claims — it's a
 *     capability with a 15-minute shelf life, not a credential.
 * If this app's threat model can't accept that, the fix belongs on the
 * backend (an httpOnly-cookie-based grant for browser clients specifically),
 * not a workaround here — anything client-side (encrypting the token with a
 * key that also has to live in the browser, for instance) is security
 * theatre against the same attacker.
 */
function storeFor(persistent: boolean): Storage | null {
  if (typeof window === 'undefined') return null;
  return persistent ? window.localStorage : window.sessionStorage;
}

export const sessionStore = {
  read(): Session | null {
    if (typeof window === 'undefined') return null;
    for (const store of [window.localStorage, window.sessionStorage]) {
      try {
        const raw = store.getItem(SESSION_KEY);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Session;
        if (parsed?.user?.id && parsed?.token && typeof parsed.expiresAt === 'number') {
          return parsed;
        }
        // Malformed payload — drop it rather than fail the whole boot.
        store.removeItem(SESSION_KEY);
      } catch {
        // Storage disabled or JSON corrupt; treat as signed out.
      }
    }
    return null;
  },

  write(session: Session): void {
    const store = storeFor(session.persistent);
    if (!store) return;
    try {
      // Clear the other store so a session can never exist in both.
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      store.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Private mode: the session simply won't survive a reload.
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to do — the in-memory state is authoritative for this tab.
    }
  },

  /** Email only. The password is never persisted anywhere. */
  readRememberedEmail(): string {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  },

  writeRememberedEmail(email: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Non-fatal.
    }
  },
};
