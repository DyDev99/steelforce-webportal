/**
 * Feature flags.
 *
 * A flag belongs here when a capability must be switchable without a code
 * change — an unfinished module, a rollout gated per environment, or a
 * dependency that may be absent. A flag is NOT an access-control mechanism:
 * use permissions (`config/permissions.ts`) for anything a user should or
 * should not be allowed to do.
 *
 * Keep this list short. Every flag is a branch that has to be tested in both
 * states, and a flag nobody ever flips is dead weight — delete it once the
 * feature has shipped.
 */

import { environment, hasApiBaseUrl } from './environment';

export const features = {
  /**
   * True once a backend base URL is configured. Repositories bound to API
   * adapters must not be reachable before this is set, or every call fails
   * with a configuration error.
   */
  liveApi: hasApiBaseUrl(),

  /**
   * Planning renders the interactive Google map when a key is present and the
   * built-in demo map otherwise. Both paths are supported; this is not a
   * temporary flag.
   */
  googleMaps: environment.googleMapsKey.length > 0,
} as const;

export type FeatureFlag = keyof typeof features;

export function isEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
