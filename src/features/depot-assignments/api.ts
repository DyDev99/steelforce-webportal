/**
 * Bulk depot assignment by spreadsheet — `AdminDepotAssignmentsController`.
 *
 * ## What an assignment is here
 *
 * Putting a depot on a representative's day for a date writes the same route and stop
 * rows the planning board writes. It is **not** a change of depot ownership — which
 * representative holds the relationship with a customer is a separate field the import
 * never touches.
 *
 * ## Read `imported`, never the counts
 *
 * The import is all-or-nothing. `successfulRows` means "rows that passed validation",
 * and when `imported` is false **none of them were saved** — so a screen that reported
 * "94 successful" off a refused import would tell somebody 94 assignments exist when
 * none do.
 */
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapData } from '@/infrastructure/api/envelope';

const ENDPOINT = '/api/v1/admin/depot-assignments';

/**
 * How long to allow for an import.
 *
 * A two-thousand-row workbook resolves every representative and depot and walks each
 * route before it commits. The client's default is tuned for list reads and cuts this
 * off part-way, which looks like a failure on a request the server is still completing.
 */
const IMPORT_TIMEOUT_MS = 120_000;

export const ImportErrorSchema = z.object({
  row: z.number(),
  assignmentDate: z.string().nullable().optional(),
  salesRepCode: z.string().nullable().optional(),
  salesRepName: z.string().nullable().optional(),
  depotCode: z.string().nullable().optional(),
  depotName: z.string().nullable().optional(),
  regionCode: z.string().nullable().optional(),
  message: z.string(),
});

export const ImportResultSchema = z.object({
  totalRows: z.number().default(0),
  successfulRows: z.number().default(0),
  failedRows: z.number().default(0),
  imported: z.boolean().default(false),
  routesCreated: z.number().default(0),
  stopsCreated: z.number().default(0),
  errors: z.array(ImportErrorSchema).default([]),
});

export type ImportErrorDto = z.infer<typeof ImportErrorSchema>;
export type ImportResultDto = z.infer<typeof ImportResultSchema>;

/** Hands a blob to the browser as a save, then releases it. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Each object URL pins its blob in memory until revoked. Deferred rather than
  // immediate: revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const depotAssignmentsApi = {
  /**
   * Downloads the template.
   *
   * Generated per request from live representatives and depots, so the dropdowns carry
   * the codes that exist right now — it is not a static file.
   */
  downloadTemplate: async (signal?: AbortSignal) => {
    const { blob, fileName } = await apiClient.downloadFile('GET', `${ENDPOINT}/template`, { signal });

    saveBlob(blob, fileName ?? 'depot-assignments-template.xlsx');
  },

  /** Uploads a workbook and returns what the server made of it. */
  import: async (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append('file', file);

    const body = await apiClient.post<unknown>(`${ENDPOINT}/import`, {
      body: form,
      signal,
      timeoutMs: IMPORT_TIMEOUT_MS,
    });

    return ImportResultSchema.parse(unwrapData(body));
  },

  /**
   * Downloads the failed rows as a workbook.
   *
   * Re-sends the same file; the server re-validates it as a dry run, so asking for the
   * report can never import anything as a side effect.
   */
  downloadErrorReport: async (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append('file', file);

    const { blob, fileName } = await apiClient.downloadFile('POST', `${ENDPOINT}/import/error-report`, {
      body: form,
      signal,
      timeoutMs: IMPORT_TIMEOUT_MS,
    });

    saveBlob(blob, fileName ?? 'depot-assignment-errors.xlsx');
  },
};
