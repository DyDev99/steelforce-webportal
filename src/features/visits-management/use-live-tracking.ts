import { useEffect, useRef, useState, useCallback } from 'react';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { useAuth } from '@/lib/auth/auth-context';
import { apiConfig } from '@/config/environment';

/** One representative's latest reported position, as pushed by the hub. */
export interface LivePosition {
  repId: string;
  repName: string | null;
  lat: number;
  lng: number;
  /** The fix's own accuracy estimate, in metres. */
  accuracyMetres: number | null;
  /** When the handset took the fix — not when we received it. */
  capturedAt: string;
  /** The device's own claim that the fix was faked. Testimony, never a finding. */
  isMocked: boolean;
}

/**
 * The wire shape of `repPositionMoved`, mirroring `RepPositionMoved` on the server.
 *
 * SignalR serialises with the default camelCase policy, so `Latitude` arrives as
 * `latitude`. Naming these fields `lat`/`lng` — as this hook previously did — meant
 * every coordinate read as `undefined` and no position ever reached the map.
 */
interface RepPositionMovedEvent {
  repId: string;
  repName?: string | null;
  routeId?: string | null;
  samplesInBatch?: number;
  sample: {
    latitude: number;
    longitude: number;
    accuracyMetres?: number;
    speedMetresPerSecond?: number | null;
    headingDegrees?: number | null;
    isMocked?: boolean;
    capturedAt: string;
    receivedAt?: string;
  };
}

/**
 * Live field positions, pushed from `POST /api/v1/mobile/visits/telemetry`.
 *
 * Keyed by **representative**, which is what the hub broadcasts: telemetry carries no
 * session or device id. A rep signed in on two handsets therefore has one live
 * position, not two. Consumers that show sessions should treat this as a freshness
 * overlay rather than the source of truth — see the Sessions & Devices board.
 *
 * Requires `visits.readall`: the hub is a single broadcast group and cannot filter
 * per connection, so it is not opened for users who may only see their own track.
 */
export function useLiveTracking() {
  const { session, can } = useAuth();
  const [positions, setPositions] = useState<Record<string, LivePosition>>({});
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  const canReadAll = can('visits.readall');

  useEffect(() => {
    if (!canReadAll || !session?.token) return;

    const baseUrl = apiConfig.baseUrl || window.location.origin;
    const conn = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/admin/field-tracking`, {
        accessTokenFactory: () => session.token,
      })
      .withAutomaticReconnect()
      .build();

    conn.on('repPositionMoved', (event: RepPositionMovedEvent) => {
      const sample = event?.sample;
      if (!sample || !Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude)) {
        return;
      }

      setPositions((prev) => {
        // Batches can arrive out of order after a handset drains a backlog; an older
        // fix must not overwrite a newer one already on the map.
        const existing = prev[event.repId];
        if (existing && Date.parse(existing.capturedAt) >= Date.parse(sample.capturedAt)) {
          return prev;
        }

        return {
          ...prev,
          [event.repId]: {
            repId: event.repId,
            repName: event.repName ?? null,
            lat: sample.latitude,
            lng: sample.longitude,
            accuracyMetres: Number.isFinite(sample.accuracyMetres)
              ? (sample.accuracyMetres as number)
              : null,
            capturedAt: sample.capturedAt,
            isMocked: sample.isMocked ?? false,
          },
        };
      });
    });

    conn.onreconnected(() => setIsConnected(true));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onclose(() => setIsConnected(false));

    conn.start()
      .then(() => setIsConnected(true))
      .catch((error) => console.error('Error connecting to field-tracking hub', error));

    connectionRef.current = conn;

    return () => {
      connectionRef.current = null;
      setIsConnected(false);
      void conn.stop();
    };
  }, [session?.token, canReadAll]);

  const clearTracking = useCallback(() => setPositions({}), []);

  return { positions, clearTracking, isConnected };
}
