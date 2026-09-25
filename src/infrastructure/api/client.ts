import { apiConfig, hasApiBaseUrl } from '@/config/environment';
import { ApiError, httpApiError } from '@/domain/errors/api-error';
import type { ApiAuthProvider, ApiMethod, ApiQuery, ApiRequestOptions } from './types';

function appendQuery(path: string, query: ApiQuery | undefined): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const entry of values) {
      if (entry !== null && entry !== undefined) params.append(key, String(entry));
    }
  }
  const encoded = params.toString();
  return encoded ? `${path}${path.includes('?') ? '&' : '?'}${encoded}` : path;
}

function requestUrl(path: string, query?: ApiQuery): string {
  const requestPath = appendQuery(path, query);
  if (/^https?:\/\//i.test(requestPath)) {
    throw new ApiError(0, 'configuration', 'api.error.configuration', {
      code: 'ABSOLUTE_API_URL_NOT_ALLOWED',
    });
  }
  const formatted = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  return apiConfig.baseUrl ? `${apiConfig.baseUrl}${formatted}` : formatted;
}

function correlationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `sf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Pulls the file name out of a `Content-Disposition` header.
 *
 * Prefers the RFC 5987 `filename*` form, which is the one that survives non-ASCII
 * names; falls back to plain `filename`. Returns null rather than a guess when the
 * header is absent, so the caller decides what to call the file.
 */
function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // A malformed encoding is not worth failing a download over.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}

async function responseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * The single HTTP boundary for feature repositories. It deliberately knows no
 * endpoint paths or backend DTOs, so adding a backend contract does not leak
 * transport concerns into components.
 */
export class ApiClient {
  private authProvider: ApiAuthProvider | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  setAuthProvider(provider: ApiAuthProvider | null): void {
    this.authProvider = provider;
  }

  get<T>(path: string, options?: Omit<ApiRequestOptions, 'body'>): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  put<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  patch<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  /**
   * Fetches a binary body — an image or a PDF — as an object URL.
   *
   * Authenticated endpoints cannot be used as an `<img src>`: the tag sends no
   * Authorization header, so the browser gets a 401 and renders a broken image. This
   * fetches with the bearer token and hands back a `blob:` URL the tag can use.
   *
   * **The caller owns the URL and must `URL.revokeObjectURL` it.** Each one pins its
   * blob in memory until revoked; a gallery that forgets leaks every image the user
   * scrolls past.
   */
  async getObjectUrl(path: string, options?: Omit<ApiRequestOptions, 'body'>): Promise<string> {
    const token = this.authProvider?.getAccessToken();
    const headers = new Headers(options?.headers);
    headers.set('X-Correlation-Id', correlationId());
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(requestUrl(path, options?.query), {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    if (!response.ok) {
      throw httpApiError(response.status, undefined);
    }

    return URL.createObjectURL(await response.blob());
  }

  /**
   * Fetches a file the browser should save, with its server-chosen name.
   *
   * Distinct from {@link getObjectUrl}, which hands back a `blob:` URL for an `<img>`:
   * a download needs the file *name* too, and that only exists in the
   * `Content-Disposition` header — so a caller using `getObjectUrl` has to invent one.
   *
   * Supports POST because the error report is generated from an uploaded workbook, and
   * a report is not something a GET should produce from a request body.
   *
   * **No refresh-and-retry on 401**, matching `getObjectUrl`. A download is always a
   * deliberate click, so an expired session surfaces as a failed download the user can
   * repeat, rather than silently re-authenticating inside a file transfer.
   */
  async downloadFile(
    method: 'GET' | 'POST',
    path: string,
    options?: ApiRequestOptions
  ): Promise<{ blob: Blob; fileName: string | null }> {
    const token = this.authProvider?.getAccessToken();
    const headers = new Headers(options?.headers);
    headers.set('X-Correlation-Id', correlationId());
    if (token) headers.set('Authorization', `Bearer ${token}`);

    // FormData sets its own multipart boundary; setting Content-Type by hand here
    // produces a boundary-less header the server cannot parse.
    const body = options?.body instanceof FormData ? options.body : undefined;

    const response = await fetch(requestUrl(path, options?.query), {
      method,
      headers,
      body,
      signal: options?.signal,
    });

    if (!response.ok) {
      throw httpApiError(response.status, undefined);
    }

    return {
      blob: await response.blob(),
      fileName: fileNameFromDisposition(response.headers.get('content-disposition')),
    };
  }

  delete<T = void>(path: string, options?: Omit<ApiRequestOptions, 'body'>): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  async request<T>(method: ApiMethod, path: string, options: ApiRequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
    let timedOut = false;
    const timeout = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });

    const requestId = correlationId();
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Correlation-Id', requestId);
    const token = this.authProvider?.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let fetchBody: BodyInit | undefined = undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        fetchBody = options.body;
      } else {
        headers.set('Content-Type', 'application/json');
        fetchBody = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(requestUrl(path, options.query), {
        method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });
      const body = options.parseJson === false ? undefined : await responseBody(response);
      const responseCorrelationId =
        response.headers.get('x-correlation-id') ?? response.headers.get('x-request-id') ?? requestId;

      if (!response.ok) {
        const error = httpApiError(response.status, body, responseCorrelationId);
        
        // 401 Interceptor: Attempt to refresh token and replay the request
        if (error.kind === 'unauthorized' && this.authProvider?.attemptRefresh) {
          if (!this.refreshPromise) {
            this.refreshPromise = this.authProvider.attemptRefresh().finally(() => {
              this.refreshPromise = null;
            });
          }
          
          const newToken = await this.refreshPromise;
          if (newToken) {
            // Replay the request with the new token
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryResponse = await fetch(requestUrl(path, options.query), {
              method,
              headers,
              body: options.body === undefined ? undefined : JSON.stringify(options.body),
              signal: controller.signal,
            });
            const retryBody = options.parseJson === false ? undefined : await responseBody(retryResponse);
            if (retryResponse.ok) {
              return retryBody as T;
            }
          }
        }
        
        if (error.kind === 'unauthorized') this.authProvider?.onUnauthorized?.();
        throw error;
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError(0, 'timeout', 'api.error.timeout', { correlationId: requestId });
      if (controller.signal.aborted) {
        throw new ApiError(0, 'aborted', 'api.error.aborted', { correlationId: requestId });
      }
      throw new ApiError(0, 'network', 'api.error.network', { correlationId: requestId });
    } finally {
      globalThis.clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}

export const apiClient = new ApiClient();
