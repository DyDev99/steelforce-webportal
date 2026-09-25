'use client';

import { useEffect, useRef } from 'react';
import { apiClient } from '@/infrastructure/api/client';
import { useAuth } from '@/lib/auth/auth-context';

/** How often a signed-in tab refreshes its position. */
const REPORT_INTERVAL_MS = 5 * 60_000;

/** Storage key recording that the user declined, so we ask at most once. */
const DECLINED_KEY = 'steelforce-location-declined';

/**
 * Reports this browser's position against its own session.
 *
 * Feeds the portal's Sessions &amp; Devices board. Without it a web row reads "No
 * location reported" forever: telemetry only ever comes from the mobile app, and a
 * desktop browser has no push registration to carry a position either.
 *
 * Three deliberate constraints:
 *
 * - **Asks once, after sign-in, never on the login screen.** A permission dialog over
 *   a password field is hostile, and a denial there is remembered by the browser -
 *   poisoning the well for good. If the user declines, that is recorded and we do not
 *   ask again on this device.
 * - **Never blocks anything.** Every failure path is silent; the portal works
 *   identically with location off, and the board honestly shows no location.
 * - **Secure contexts only.** Browsers refuse geolocation over plain HTTP, so on a
 *   non-localhost HTTP origin this does nothing at all rather than erroring per tick.
 */
export function useReportLocation() {
  const { isAuthenticated } = useAuth();
  const reporting = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (!window.isSecureContext) return;

    let cancelled = false;

    const report = () => {
      if (cancelled || reporting.current) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          reporting.current = true;
          apiClient
            .post<void>('/api/v1/auth/sessions/current/location', {
              body: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: Number.isFinite(position.coords.accuracy)
                  ? position.coords.accuracy
                  : undefined,
                capturedAt: new Date(position.timestamp).toISOString(),
              },
            })
            .catch(() => {
              // A dropped position is not worth a toast. The board simply keeps the
              // last one it had.
            })
            .finally(() => {
              reporting.current = false;
            });
        },
        (error) => {
          // PERMISSION_DENIED is 1. Remember it so the user is asked once per device
          // and not on every page load.
          if (error.code === error.PERMISSION_DENIED) {
            try {
              localStorage.setItem(DECLINED_KEY, '1');
            } catch {
              // Private mode: we simply ask again next session.
            }
          }
        },
        { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false }
      );
    };

    const start = async () => {
      try {
        if (localStorage.getItem(DECLINED_KEY) === '1') return;
      } catch {
        // Unreadable storage is not a reason to skip the feature.
      }

      // Where the Permissions API is available, only 'granted' and 'prompt' are worth
      // acting on; 'denied' would throw the same dialog at a wall every time.
      try {
        const status = await navigator.permissions?.query({
          name: 'geolocation' as PermissionName,
        });
        if (status && status.state === 'denied') return;
      } catch {
        // Older Safari has no permissions.query; fall through and let the prompt decide.
      }

      report();
    };

    void start();
    const timer = window.setInterval(report, REPORT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated]);
}
