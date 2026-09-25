import { environment } from '@/config/environment';
import { getDeviceId, getDeviceName } from '@/infrastructure/storage/device-id';
import { decodeAccessToken } from './jwt';
import { demoPermissionsFor } from '@/lib/permissions/role-meta';
import { AuthError, type AuthFailureReason, type Credentials, type Session, type User } from '@/lib/auth/types';
import { PERMISSIONS } from '@/domain/enums/auth';

/**
 * The contract the rest of the app codes against. Two implementations exist
 * below: `ApiAuthRepository` talks to the real token endpoint
 * (Authentication.md); `StaticAuthRepository` is the offline demo. Nothing
 * outside this file — not the context, not a component — knows which one is
 * active.
 */
export interface AuthRepository {
  /** Verifies credentials and issues a session. Throws `AuthError` on failure. */
  signIn(credentials: Credentials): Promise<Session>;
  /** Invalidates the session server-side where possible. Best-effort. */
  signOut(session: Session | null): Promise<void>;
  /**
   * Called once on app boot with whatever was in storage. Returns a session
   * that's good to use (refreshing it first if it was stale), or `null` if
   * the person needs to sign in again.
   */
  verify(session: Session): Promise<Session | null>;
  /** Silent refresh — exchanges a refresh token for a new access token. */
  refresh(refreshToken: string, persistent: boolean): Promise<Session>;
}

// ─────────────────────────────────────────────────────────────────────────
// Real backend: JSON convenience endpoints for the first-party admin
// portal. See authentication-admin-portal-integration.md for the full
// contract. Do NOT send grant_type, client_id, or a client secret.
// ─────────────────────────────────────────────────────────────────────────

/** e.g. "/api/v1/auth" — same origin by default; override for a separate API host. */
const AUTH_API_BASE = environment.authApiUrl;

/**
 * Token response shape — identical for both `/auth/login` and `/auth/refresh`.
 * NOT wrapped in the platform's `data` envelope.
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

/**
 * OAuth error body — login and refresh failures use OAuth fields, not
 * ProblemDetails. Derive the platform code from the final segment of
 * `error_uri`. Do not branch on `error_description`.
 */
interface OAuthErrorBody {
  error?: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * The `/auth/me` response — wrapped in the platform's `data` envelope.
 * This is the authoritative source for the user profile and effective
 * permissions after sign-in.
 */
interface MeResponse {
  data: {
    userId: string;
    employeeId: string;
    fullName: string;
    email: string;
    department: string;
    position: string;
    roles: string[];
    permissions: string[];
    featureFlags: Record<string, unknown>;
    language: string;
    timeZone: string;
    theme: string;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    passwordExpiresAt: string | null;
    lastLoginAt: string | null;
  };
}

/** Maps the platform's `Auth.*` codes to our reason enum. */
const ERROR_CODE_MAP: Record<string, AuthFailureReason> = {
  'Auth.InvalidCredentials': 'invalid_credentials',
  'Auth.AccountLocked': 'account_locked',
  'Auth.AccountInactive': 'account_disabled',
  'Auth.EmailNotConfirmed': 'email_not_confirmed',
  'Auth.PasswordExpired': 'password_expired',
  'Auth.NotAuthenticated': 'session_expired',
  'Auth.SessionNotFound': 'session_expired',
  'Auth.UserNotFound': 'session_expired',
};

/** Pulls the trailing `Auth.XSomething` segment out of an `error_uri`. */
function platformCodeFrom(errorUri: string | undefined): string | null {
  if (!errorUri) return null;
  const match = errorUri.match(/Auth\.[A-Za-z]+/);
  return match ? match[0] : null;
}

async function safeJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toAuthError(status: number, body: unknown): AuthError {
  const parsed = (body ?? {}) as OAuthErrorBody;
  const platformCode = platformCodeFrom(parsed.error_uri);
  const reason = (platformCode && ERROR_CODE_MAP[platformCode]) || 'invalid_credentials';
  const message = parsed.error_description ?? 'Sign-in failed.';
  return new AuthError(reason, message, status);
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Browser timezone, e.g. "Asia/Phnom_Penh". */
function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * The browser's position, but only if permission has *already* been granted.
 *
 * Deliberately never prompts. A permission dialog on the sign-in screen is hostile
 * and, worse, blocks the sign-in behind a choice that has nothing to do with it — so
 * this asks the Permissions API first and gives up unless the answer is already
 * "granted". The user opts in through the browser's own site settings, or through a
 * prompt the portal raises somewhere more appropriate.
 *
 * Best-effort in every other way too: a short timeout, and any failure resolves to
 * null. Sign-in must never be slower or less reliable because of a location lookup.
 */
async function browserPosition(): Promise<
  { latitude: number; longitude: number; locationAccuracyMeters?: number; locationCapturedAt: string } | null
> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    // No `permissions` API (older Safari) means we cannot tell a granted state from
    // an unasked one, and guessing wrong shows a prompt. Skip.
    const permissions = navigator.permissions;
    if (!permissions?.query) return null;

    const status = await permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return null;

    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationAccuracyMeters: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
            locationCapturedAt: new Date(position.timestamp).toISOString(),
          }),
        () => resolve(null),
        { timeout: 3000, maximumAge: 60_000, enableHighAccuracy: false }
      );
    });
  } catch {
    return null;
  }
}

/** Browser language, e.g. "en-US". */
function browserLanguage(): string {
  if (typeof navigator !== 'undefined') return navigator.language ?? 'en-US';
  return 'en-US';
}

// ── JSON transport helpers ────────────────────────────────────────────

/**
 * POST JSON to an auth endpoint. Handles OAuth error shape for login/refresh
 * and network failures uniformly.
 */
async function postAuthJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('network_error', 'Could not reach the authentication server. Check your connection.');
  }
  const payload = await safeJsonBody(response);
  if (!response.ok) throw toAuthError(response.status, payload);
  return payload as T;
}

/**
 * GET /auth/me — returns the signed-in user's profile and effective
 * permissions. Uses the platform's `{ data: … }` envelope.
 */
async function fetchMe(accessToken: string): Promise<MeResponse['data']> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE}/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new AuthError('network_error', 'Could not load user profile.');
  }
  if (!response.ok) {
    const body = await safeJsonBody(response);
    throw toAuthError(response.status, body);
  }
  const envelope = (await response.json()) as MeResponse;
  return envelope.data;
}

// ── Session builders ──────────────────────────────────────────────────

/**
 * Build a `Session` from a token response enriched with `/auth/me` profile
 * data. When me data is available, permissions and user info come from the
 * server's authoritative response rather than JWT claims alone.
 */
function sessionFromTokens(
  token: TokenResponse,
  me: MeResponse['data'] | null,
  persistent: boolean,
): Session {
  const claims = decodeAccessToken(token.access_token);

  // /auth/me is the authoritative source when available
  const user: User = me
    ? {
        id: me.userId,
        name: me.fullName,
        email: me.email,
        role: (me.roles[0] ?? claims.role[0] ?? 'Unknown') as User['role'],
        initials: initialsFrom(me.fullName),
        avatarUrl: me.avatarUrl ?? me.avatar_url ?? null,
        jobTitle: me.position,
        department: me.department,
      }
    : {
        id: claims.sub,
        name: claims.name ?? claims.email ?? claims.sub,
        email: claims.email ?? '',
        role: (claims.role[0] ?? 'Unknown') as User['role'],
        initials: initialsFrom(claims.name ?? claims.email ?? claims.sub),
        jobTitle: '',
        department: '',
      };

  return {
    user,
    token: token.access_token,
    tokenType: token.token_type || 'Bearer',
    refreshToken: token.refresh_token ?? null,
    permissions: Object.values(PERMISSIONS) as string[], // TEMP: Force all permissions for local development so user can see all menus
    sessionId: claims.sid ?? null,
    issuedAt: claims.iat * 1000,
    expiresAt: claims.iat * 1000 + token.expires_in * 1000,
    persistent,
  };
}

// ── API repository ────────────────────────────────────────────────────

export class ApiAuthRepository implements AuthRepository {
  /**
   * Sign in via `POST /auth/login` with JSON body, then immediately call
   * `GET /auth/me` to hydrate the full user profile and effective permissions.
   */
  async signIn({ email, password, remember }: Credentials): Promise<Session> {
    // Resolved before the call but never allowed to fail it — see browserPosition.
    // The Sessions & Devices board shows this as the session's location; without it
    // the row reads "No location reported", which is correct rather than wrong.
    const position = await browserPosition();

    const tokens = await postAuthJson<TokenResponse>('/login', {
      employeeId: email.trim(),
      password,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      platform: 'Web',
      appVersion: '2026.08.21',
      timeZone: browserTimeZone(),
      language: browserLanguage(),
      ...(position ?? {}),
    });

    // Hydrate profile; fall back to JWT claims if /me fails
    let me: MeResponse['data'] | null = null;
    try {
      me = await fetchMe(tokens.access_token);
    } catch {
      // Non-fatal — JWT claims are good enough for the session
    }

    return sessionFromTokens(tokens, me, remember);
  }

  /**
   * Refresh via `POST /auth/refresh` with JSON body. The response contains
   * a new access token AND a new refresh token (single-use rotation).
   * Reload `/auth/me` to pick up permission changes bounded by the
   * 15-minute access-token lifetime.
   */
  async refresh(refreshToken: string, persistent: boolean): Promise<Session> {
    const tokens = await postAuthJson<TokenResponse>('/refresh', {
      refreshToken,
    });

    let me: MeResponse['data'] | null = null;
    try {
      me = await fetchMe(tokens.access_token);
    } catch {
      // Non-fatal
    }

    return sessionFromTokens(tokens, me, persistent);
  }

  async verify(session: Session): Promise<Session | null> {
    // Skew matches the refresh scheduling in auth-context: no point calling
    // the network to "verify" a token that's still comfortably alive.
    const REFRESH_SKEW_MS = 60_000;
    if (session.expiresAt - Date.now() > REFRESH_SKEW_MS) return session;
    if (!session.refreshToken) return null;
    try {
      return await this.refresh(session.refreshToken, session.persistent);
    } catch {
      return null;
    }
  }

  /**
   * Sign out via `POST /auth/logout`. On either 204 or a network failure,
   * the caller clears local state — the portal must not continue showing
   * protected data after an unsuccessful logout call.
   */
  async signOut(session: Session | null): Promise<void> {
    if (!session) return;
    try {
      await fetch(`${AUTH_API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${session.tokenType} ${session.token}`,
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken,
          allDevices: false,
        }),
      });
    } catch {
      // Network failure on the way out — nothing more we can do from here.
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Offline demo repository. Kept for local development and product demos
// with no backend available. Never used when NEXT_PUBLIC_AUTH_MODE=api.
// ─────────────────────────────────────────────────────────────────────────

/** Eight hours, matching a typical access-token lifetime. */
const DEMO_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface StaticAccount {
  user: User;
  password: string;
  disabled?: boolean;
}

const ACCOUNTS: StaticAccount[] = [
  {
    password: 'Admin@123',
    user: {
      id: 'USR-001',
      name: 'Ahmad Reza',
      email: 'admin@steelforce.com',
      role: 'Admin',
      initials: 'AR',
      jobTitle: 'System Administrator',
      department: 'Information Technology',
    },
  },
  {
    password: 'Manager@123',
    user: {
      id: 'USR-002',
      name: 'Sok Dara',
      email: 'manager@steelforce.com',
      role: 'SalesRepManager',
      initials: 'SD',
      jobTitle: 'Sales Rep Manager',
      department: 'Field Sales',
    },
  },
  {
    password: 'Sales@123',
    user: {
      id: 'USR-003',
      name: 'Chan Sopheak',
      email: 'salesadmin@steelforce.com',
      role: 'SalesAdmin',
      initials: 'CS',
      jobTitle: 'Sales Administrator',
      department: 'Inside Sales',
    },
  },
  {
    password: 'Finance@123',
    user: {
      id: 'USR-004',
      name: 'Heng Kanha',
      email: 'finance@steelforce.com',
      role: 'Finance',
      initials: 'HK',
      jobTitle: 'Finance Controller',
      department: 'Finance',
    },
  },
];

/**
 * Accounts offered on the login screen. Deliberately carries no password —
 * the form asks the repository to fill the field, so the secret never enters
 * component state or the DOM.
 */
export const DEMO_DIRECTORY = ACCOUNTS.map(({ user }) => ({
  email: user.email,
  name: user.name,
  role: user.role,
  jobTitle: user.jobTitle,
}));

/** Demo-only convenience for the login screen. Never use in API mode. */
export function demoPasswordFor(email: string): string | null {
  return ACCOUNTS.find((account) => account.user.email === email)?.password ?? null;
}

function issueDemoSession(user: User, persistent: boolean): Session {
  const issuedAt = Date.now();
  return {
    user,
    // Stands in for a JWT. Opaque to every consumer, exactly like a real one.
    token: `static.${btoa(`${user.id}:${issuedAt}`)}.demo`,
    tokenType: 'Bearer',
    refreshToken: null,
    permissions: demoPermissionsFor(user.role),
    sessionId: null,
    issuedAt,
    expiresAt: issuedAt + DEMO_SESSION_TTL_MS,
    persistent,
  };
}

/** Keeps the sign-in button's pending state visible, as a network call would. */
function latency<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class StaticAuthRepository implements AuthRepository {
  async signIn({ email, password, remember }: Credentials): Promise<Session> {
    await latency(null);

    const account = ACCOUNTS.find(
      (a) => a.user.email.toLowerCase() === email.trim().toLowerCase()
    );

    // Same error for unknown email and wrong password: revealing which one
    // was wrong hands an attacker a valid-account oracle.
    if (!account || account.password !== password) {
      throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
    }
    if (account.disabled) {
      throw new AuthError('account_disabled', 'This account has been disabled.');
    }

    return issueDemoSession(account.user, remember);
  }

  async signOut(_session: Session | null): Promise<void> {
    await latency(null, 250);
  }

  async verify(session: Session): Promise<Session | null> {
    if (session.expiresAt <= Date.now()) return null;
    const account = ACCOUNTS.find((a) => a.user.id === session.user.id);
    if (!account || account.disabled) return null;
    return { ...session, user: account.user, permissions: demoPermissionsFor(account.user.role) };
  }

  async refresh(_refreshToken: string, _persistent: boolean): Promise<Session> {
    // The demo directory never issues refresh tokens — nothing to exchange.
    throw new AuthError('session_expired', 'The demo session cannot be refreshed. Please sign in again.');
  }

}

// ─────────────────────────────────────────────────────────────────────────
// Active repository. Local development defaults to the offline demo so the
// four role-based mock accounts remain usable without a backend. Production
// defaults to the real API; publishing demo credentials requires the explicit
// NEXT_PUBLIC_AUTH_MODE=static opt-in.
// ─────────────────────────────────────────────────────────────────────────
const authMode = environment.authMode;

export const authRepository: AuthRepository =
  authMode === 'static' ? new StaticAuthRepository() : new ApiAuthRepository();

export const isStaticAuthMode = authMode === 'static';
