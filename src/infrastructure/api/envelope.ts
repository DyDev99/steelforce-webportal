/**
 * Unwrapping the platform's response envelope.
 *
 * Every admin endpoint answers with `{ data, meta }`. What varies is `data`: a single
 * resource returns an object, a paged list returns a **bare array**, and the page's
 * counts live in `meta.pagination` rather than beside the rows.
 *
 * That last part is the trap. A repository that writes
 * `ListSchema.parse(body.data)` against a `{ items, totalCount }` schema is parsing an
 * array against an object schema. Zod throws, React Query reports the query as failed,
 * and the screen shows a generic "failed to load" — which reads exactly like the server
 * being down, so the first hour of debugging is spent on the backend. Both the visits
 * board and the planning pool were written that way.
 *
 * These helpers exist so the envelope is decoded in one place, by name, instead of
 * being re-guessed with `body.data || body` at each call site.
 */

/** A paged response, in the shape feature schemas actually want. */
export interface ApiPage<T> {
  items: T[];
  totalCount: number;
}

/** The pagination block the platform puts in `meta`. */
interface EnvelopeMeta {
  pagination?: {
    pageNumber?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns the payload of a single-resource response.
 *
 * Tolerates an already-unwrapped body, because a few older endpoints answer without the
 * envelope and a portal upgraded endpoint by endpoint must not break in between.
 */
export function unwrapData<T>(body: unknown): T {
  if (isRecord(body) && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}

/**
 * Returns the rows and total of a paged response, whatever shape it arrived in.
 *
 * Handles, in order: the platform envelope (`data` array + `meta.pagination`), a body
 * that is already `{ items, totalCount }`, and a bare array.
 *
 * **`totalCount` falls back to the number of rows returned, never to zero.** A pool
 * header reading "0 customers" above a list of fifty is a bug report; one reading "50"
 * when the true total is larger is merely a page boundary, which is the cheaper mistake.
 */
export function unwrapPage<T>(body: unknown): ApiPage<T> {
  if (isRecord(body) && Array.isArray(body.data)) {
    const items = body.data as T[];
    const meta = body.meta as EnvelopeMeta | undefined;

    return {
      items,
      totalCount: meta?.pagination?.totalCount ?? items.length,
    };
  }

  const inner: unknown = isRecord(body) && 'data' in body ? body.data : body;

  if (Array.isArray(inner)) {
    return { items: inner as T[], totalCount: inner.length };
  }

  if (isRecord(inner) && Array.isArray(inner.items)) {
    const items = inner.items as T[];

    return {
      items,
      totalCount: typeof inner.totalCount === 'number' ? inner.totalCount : items.length,
    };
  }

  return { items: [], totalCount: 0 };
}

/**
 * Returns the rows of a list response that is not paged.
 *
 * Separate from {@link unwrapPage} because the endpoints that return a plain array —
 * a visit's photographs, a representative's telemetry — have no `meta.pagination`, and
 * asking for a total there would invent one.
 */
export function unwrapList<T>(body: unknown): T[] {
  if (isRecord(body) && Array.isArray(body.data)) {
    return body.data as T[];
  }

  if (Array.isArray(body)) {
    return body as T[];
  }

  const inner: unknown = isRecord(body) && 'data' in body ? body.data : body;

  if (isRecord(inner) && Array.isArray(inner.items)) {
    return inner.items as T[];
  }

  return [];
}
