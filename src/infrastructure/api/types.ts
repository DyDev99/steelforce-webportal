export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiQueryValue = string | number | boolean | null | undefined;
export type ApiQuery = Record<string, ApiQueryValue | readonly ApiQueryValue[]>;

export interface ApiRequestOptions {
  headers?: HeadersInit;
  query?: ApiQuery;
  /** JSON-serializable request payload. */
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Set false only for endpoints that intentionally return a non-JSON body. */
  parseJson?: boolean;
}

export interface ApiAuthProvider {
  getAccessToken: () => string | null;
  /** Attempt to refresh the access token. Returns the new token if successful. */
  attemptRefresh?: () => Promise<string | null>;
  /** Called after a 401 so AuthProvider can clear its existing session state. */
  onUnauthorized?: () => void;
}
