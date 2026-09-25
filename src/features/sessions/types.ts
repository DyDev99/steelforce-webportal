/**
 * The Sessions & Devices fleet view.
 *
 * Mirrors `GET /api/v1/admin/sessions` exactly, so there is no mapping layer to
 * drift. See the backend's `api-sessions-devices.md` for the contract and its
 * two standing caveats, both reflected in the comments below.
 */

export interface AdminSessionDevice {
  /** `mobile`, `tablet` or `desktop`, as reported by the client. */
  type: string | null;
  os: string | null;
  appVersion: string | null;
  /** Served from the session's device name; there is no separate model column. */
  model: string | null;
}

export interface AdminSessionLocation {
  lat: number;
  lng: number;
  /**
   * Always null from the API — reverse geocoding every row would be a paid call
   * per session per page load. Geocode client-side for markers in view if needed.
   */
  label: string | null;
  /**
   * When the handset took the fix, which can be well behind now: devices buffer
   * while offline and upload in batches. Label markers with this, never "now".
   */
  capturedAt: string | null;
}

export interface AdminSession {
  id: string;
  repId: string;
  repName: string;
  repEmployeeCode: string | null;
  /**
   * Derived from a 20-minute window on `lastActive`, not a live connection.
   * `lastActive` only advances when the device renews its token, so a healthy
   * handset is routinely minutes stale. A display heuristic; nothing is
   * authorised on it.
   */
  status: 'online' | 'offline' | string;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  device: AdminSessionDevice;
  /**
   * The *rep's* position, not the device's: telemetry is stored against a person,
   * so a rep on two handsets shows the same point twice. Null when no telemetry
   * has ever arrived — render no pin rather than falling back to 0,0.
   */
  location: AdminSessionLocation | null;
}

export interface AdminSessionQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: 'online' | 'offline';
  repId?: string;
  includeRevoked?: boolean;
}
