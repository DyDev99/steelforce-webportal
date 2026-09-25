'use client';

/**
 * Raise a new depot agreement request.
 *
 * ## Why the category picker is a list and not a text box
 *
 * The server refuses a line whose category has no active SAP material price group
 * mapping — `422 Agreement.CategoryUnmapped`. That is not an edge case here: the mapping
 * table ships empty, so on a fresh deployment *every* category is unmapped. A free-text
 * field would let somebody fill in a whole rate table and lose it on save, so the picker
 * offers exactly the mapped categories and says so plainly when there are none.
 *
 * ## Draft first, signatures second
 *
 * Saving creates a **draft**, which collects no signatures. Submitting is a separate,
 * explicit act — see the detail panel. A half-entered rate table must not start a chain
 * that four people have to unwind.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/infrastructure/api/client';
import { unwrapPage } from '@/infrastructure/api/envelope';
import {
  ENTRY_MODES,
  NATURES,
  useCategoryMappings,
  useCreateAgreement,
  type AgreementLineInput,
  type EntryMode,
  type Nature,
} from '@/features/promotions';

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

/** Searches customers for the depot picker. */
function useCustomerSearch(term: string) {
  return useQuery({
    queryKey: ['promotions', 'customer-search', term],
    queryFn: async ({ signal }) => {
      const body = await apiClient.get<unknown>('/api/v1/customers', {
        query: { pageSize: 10, search: term },
        signal,
      });
      return unwrapPage<CustomerOption>(body).items;
    },
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
  });
}

const today = () => new Date().toISOString().slice(0, 10);

/** A line as the form holds it, before it is sent. */
interface DraftLine extends AgreementLineInput {
  key: string;
}

function blankLine(categoryCode: string): DraftLine {
  return {
    key: crypto.randomUUID(),
    categoryCode,
    entryMode: 'FlatPercent',
    nature: 'OnInvoice',
    percent: null,
    currency: 'USD',
    validFrom: today(),
    validTo: null,
    tiers: [],
  };
}

export function NewRequestDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const mappings = useCategoryMappings();
  const create = useCreateAgreement();

  const categories = useMemo(
    () => (mappings.data ?? []).filter((m) => m.isActive),
    [mappings.data]
  );

  const [search, setSearch] = useState('');
  const [depot, setDepot] = useState<CustomerOption | null>(null);
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  // One id per dialog, not per click: it is what makes creation idempotent, so a double
  // submit or a retry on a flaky connection returns the first request instead of
  // raising a second proposal for the same depot.
  const [clientRequestId] = useState(() => crypto.randomUUID());

  const { data: results, isFetching } = useCustomerSearch(search);

  // Seed the first line once the mapped categories are known.
  useEffect(() => {
    if (categories.length > 0 && lines.length === 0) {
      setLines([blankLine(categories[0].categoryCode)]);
    }
  }, [categories, lines.length]);

  const patch = (key: string, change: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)));

  const valid =
    depot != null &&
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.categoryCode &&
        l.validFrom &&
        // A flat line needs a rate; a tiered or no-target line does not carry one.
        (l.entryMode !== 'FlatPercent' || (l.percent != null && l.percent > 0))
    );

  const save = () => {
    if (!depot) return;

    create
      .mutateAsync({
        clientRequestId,
        customerId: depot.id,
        remarks: remarks.trim() || undefined,
        lines: lines.map(({ key: _key, ...line }) => ({
          ...line,
          percent: line.entryMode === 'FlatPercent' ? line.percent : null,
          validTo: line.validTo || null,
        })),
      })
      .then((created) => {
        toast.success(`Draft ${created.requestNumber} created`, {
          description: 'It collects no signatures until you submit it.',
        });
        onCreated(created.id);
        onClose();
      })
      .catch((err: unknown) =>
        toast.error('Could not create the request', {
          description: err instanceof Error ? err.message : 'The server refused it.',
        })
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 card-shadow">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[14px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
              New agreement request
            </h2>
            <p className="text-[11.5px] text-gray-400 mt-0.5">
              Saved as a draft — submitting for signature is a separate step.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* The blocking precondition, stated before any effort is spent. */}
          {!mappings.isLoading && categories.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[11.5px] text-gray-700">
              <span className="font-600" style={{ fontWeight: 600 }}>
                No category mappings are configured,
              </span>{' '}
              so there is no category a rate can be agreed against — the server rejects any line whose category
              has no SAP material price group. Add mappings under Settings first.
            </div>
          )}

          {/* Depot */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Depot</label>
            {depot ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50">
                <span className="text-[12.5px] text-gray-900 truncate">
                  <span className="font-mono text-gray-500">{depot.code}</span> · {depot.name}
                </span>
                <button onClick={() => setDepot(null)} className="text-[11px] text-gray-400 hover:text-gray-600">
                  change
                </button>
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search depot by name or code (min. 2 characters)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {isFetching && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-300" />
                  )}
                </div>
                {(results?.length ?? 0) > 0 && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                    {results!.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setDepot(c);
                          setSearch('');
                        }}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50"
                      >
                        <span className="font-mono text-gray-500">{c.code}</span> · {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Discount lines</label>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-[11.5px]"
                disabled={categories.length === 0}
                onClick={() => setLines((prev) => [...prev, blankLine(categories[0].categoryCode)])}
              >
                <Plus size={13} className="mr-1" /> Add line
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="p-3 rounded-xl bg-gray-50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={line.categoryCode}
                      onChange={(e) => patch(line.key, { categoryCode: e.target.value })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px] bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.categoryCode}>
                          {c.categoryCode} → {c.sapMaterialPriceGroup}
                        </option>
                      ))}
                    </select>

                    <select
                      value={line.nature}
                      onChange={(e) => patch(line.key, { nature: e.target.value as Nature })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px] bg-white"
                    >
                      {NATURES.map((n) => (
                        <option key={n} value={n}>
                          {n.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </option>
                      ))}
                    </select>

                    <select
                      value={line.entryMode}
                      onChange={(e) => patch(line.key, { entryMode: e.target.value as EntryMode })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px] bg-white"
                    >
                      {ENTRY_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </option>
                      ))}
                    </select>

                    {/* A rate box only where a rate means something. Tiered lines carry a
                        ladder instead, which this form does not yet build — see below. */}
                    {line.entryMode === 'FlatPercent' ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={line.percent ?? ''}
                        onChange={(e) =>
                          patch(line.key, { percent: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        placeholder="Percent"
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px]"
                      />
                    ) : (
                      <div className="flex items-center text-[10.5px] text-gray-400 px-1">
                        {line.entryMode === 'Tiered' ? 'Ladder set in the field app' : 'No rate'}
                      </div>
                    )}

                    <input
                      type="date"
                      value={line.validFrom}
                      onChange={(e) => patch(line.key, { validFrom: e.target.value })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px]"
                    />
                    <input
                      type="date"
                      value={line.validTo ?? ''}
                      onChange={(e) => patch(line.key, { validTo: e.target.value || null })}
                      placeholder="Valid to (optional)"
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px]"
                    />
                  </div>

                  {lines.length > 1 && (
                    <button
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="text-[11px] text-red-500 hover:text-red-600 inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Remove line
                    </button>
                  )}
                </div>
              ))}
            </div>

            {lines.some((l) => l.entryMode === 'Tiered') && (
              <p className="text-[10.5px] text-gray-400 mt-1.5">
                A tiered line needs a contiguous ladder starting at zero, with only the last rung open-ended.
                This form does not build ladders yet, so the server will reject a tiered line saved from here.
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Why this rate is being proposed — the first approver sees this."
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-xl text-[12px]"
            disabled={!valid || create.isPending}
            onClick={save}
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Save draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
