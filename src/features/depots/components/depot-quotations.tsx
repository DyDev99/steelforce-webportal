'use client';

import { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { apiClient } from '@/infrastructure/api/client';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { formatCurrency, formatDate } from '@/lib/formatting';

/**
 * A depot's quotations.
 *
 * **This tab is quotations rather than orders on purpose.** The platform has no orders
 * API — no controller, no endpoint — so an Orders tab could only ever show invented
 * numbers. Quotations are real, and `GET /api/v1/quotations` filters by customer.
 */
interface QuotationSummary {
  id: string;
  quotationNumber?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  validUntil?: string;
}

interface ApiWrapped<T> {
  data: T;
  meta?: { pagination?: { totalCount?: number } };
}

const STATUS_TONE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Submitted: 'bg-amber-50 text-amber-700',
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Expired: 'bg-slate-100 text-slate-500',
};

export function DepotQuotations({ depotId }: { depotId: string }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      apiClient.get<ApiWrapped<QuotationSummary[]>>('/api/v1/quotations', {
        query: { customerId: depotId, page: 1, pageSize: 20 },
        signal,
      }),
    [depotId]
  );

  const { data, error, isLoading } = useRepositoryQuery(['depot-quotations', depotId], load);

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  // Quotations need `quotations.read`. Saying so beats an empty list that looks like
  // "this depot has never been quoted".
  if (error) {
    return (
      <p className="py-10 text-center text-[12.5px] text-gray-400">
        Could not load quotations. This needs the <code>quotations.read</code> permission.
      </p>
    );
  }

  const rows = data?.data ?? [];

  if (rows.length === 0) {
    return <p className="py-10 text-center text-[13px] text-gray-400">No quotations for this depot.</p>;
  }

  return (
    <div className="animate-fade-in space-y-1">
      {rows.map((q) => (
        <div
          key={q.id}
          className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 text-[12px] font-bold text-blue-600">
            <FileText size={13} /> {q.quotationNumber ?? q.id.slice(0, 8)}
          </span>
          <span className="text-[12px] text-gray-500">{q.createdAt ? formatDate(q.createdAt) : '—'}</span>
          <span className="text-[12px] font-semibold text-gray-900">
            {typeof q.totalAmount === 'number' ? formatCurrency(q.totalAmount) : '—'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_TONE[q.status ?? ''] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {q.status ?? 'Unknown'}
          </span>
        </div>
      ))}
    </div>
  );
}
