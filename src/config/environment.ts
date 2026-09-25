/**
 * The single place `process.env` is read.
 *
 * Everything here is `NEXT_PUBLIC_*` and therefore ships to the browser — it is
 * configuration, never secrets. A missing value resolves to a documented
 * default rather than throwing at import time, because a module-level throw
 * would take down the whole app during a build.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const MIN_TIMEOUT_MS = 1_000;

function configuredTimeout(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= MIN_TIMEOUT_MS ? parsed : DEFAULT_TIMEOUT_MS;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export type AuthMode = 'api' | 'static';

export const environment = {
  /**
   * Intentionally empty until the SteelForce API contract and host are known.
   * `ApiClient` raises a configuration error at request time rather than
   * falling back to an invented endpoint.
   */
  apiBaseUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? ''),
  apiTimeoutMs: configuredTimeout(process.env.NEXT_PUBLIC_API_TIMEOUT),

  /** Identity may live at a different host than the feature API. */
  authApiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_AUTH_API_URL ?? '/api/v1/auth'),
  authMode: (process.env.NEXT_PUBLIC_AUTH_MODE ??
    (process.env.NODE_ENV === 'production' ? 'api' : 'static')) as AuthMode,

  /** Optional. Planning falls back to the built-in demo map when unset. */
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',

  /** Set to true when backend deploys /api/v1/users and /api/v1/roles */
  userManagementApiEnabled: process.env.NEXT_PUBLIC_USER_MANAGEMENT_API === 'true',

  /**
   * Serve depots from `/api/v1/customers` rather than the demo master.
   *
   * Opt-in rather than opt-out: the customer API carries none of the commercial
   * analytics the CRM screens show, so switching this on trades invented figures for
   * honest blanks. See `features/depots/repositories/mappers.ts`.
   */
  depotsApiEnabled: process.env.NEXT_PUBLIC_DEPOTS_API === 'true',
} as const;

export function hasApiBaseUrl(): boolean {
  return true;
}

/** Kept as a named export because the API layer reads it on every request. */
export const apiConfig = {
  baseUrl: environment.apiBaseUrl,
  timeoutMs: environment.apiTimeoutMs,
} as const;
