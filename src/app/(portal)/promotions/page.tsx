'use client';

/**
 * Promotions — the discount catalogue.
 *
 * Replaces the depot-agreement queue this page used to show. Every discount the business
 * gives is now a promotion row: conditions, a reward, validity and a SAP mapping, taken
 * through a two-stage approval before it goes live.
 *
 * ## Two states per row, deliberately
 *
 * A promotion can have a **live** version and an **open** one being worked on at the same
 * time, because editing a live discount creates a new version rather than changing what
 * was approved. Showing only the open version's status would report a promotion as Draft
 * while customers are being charged under it today, so the live version number is shown
 * beside it whenever the two differ.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertCircle,
  BadgePercent,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageBody } from '@/components/layout/page-layout';
import { SectionHeader } from '@/components/layout/section-header';
import {
  BUSINESS_TYPE_LABELS,
  PROMOTION_BUSINESS_TYPES,
  PROMOTION_STATUSES,
  StatusChip,
  rewardLabel,
  usePromotions,
  type PromotionListItemDto,
} from '@/features/promotions';
import { CreatePromotionDialog } from './create-promotion-dialog';

function when(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? '—' : format(parsed, 'd MMM yyyy');
}

export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [creating, setCreating] = useState(false);

  const query = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(businessType ? { businessType } : {}),
    }),
    [search, status, businessType]
  );

  const { data, isLoading, isError, error } = usePromotions(query);

  const rows: PromotionListItemDto[] = data?.items ?? [];
  const liveCount = rows.filter((row) => row.status === 'Live').length;
  const awaiting = rows.filter(
    (row) => row.status === 'UnderCommercialReview' || row.status === 'UnderFinanceReview'
  ).length;

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold text-main">Promotions &amp; discounts</h1>
          <p className="text-[12px] text-muted-foreground">
            {data?.totalCount ?? 0} configured · {liveCount} live · {awaiting} awaiting a signature
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[12.5px] font-medium"
        >
          <Plus size={14} /> New promotion
        </button>
      </div>

      <Card className="p-3 rounded-card border-surface card-shadow">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code or name"
              className="w-full text-[12.5px] rounded-xl border border-surface pl-9 pr-3 py-2 bg-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
          >
            <option value="">Any status</option>
            {PROMOTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/([a-z])([A-Z])/g, '$1 $2')}
              </option>
            ))}
          </select>
          <select
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            className="text-[12.5px] rounded-xl border border-surface px-3 py-2 bg-transparent"
          >
            <option value="">Any type</option>
            {PROMOTION_BUSINESS_TYPES.map((value) => (
              <option key={value} value={value}>
                {BUSINESS_TYPE_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-0 rounded-card border-surface card-shadow overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeader title="Catalogue" icon={BadgePercent} count={rows.length} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-[13px] py-14">
            <Loader2 size={15} className="animate-spin" /> Loading promotions…
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2.5 px-5 pb-5">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] text-muted-foreground break-words">
              {error instanceof Error ? error.message : 'The catalogue could not be loaded.'}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground px-5 pb-5">
            No promotions match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-surface">
                  <th className="font-medium px-5 py-2">Code</th>
                  <th className="font-medium px-3 py-2">Name</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Reward</th>
                  <th className="font-medium px-3 py-2">Valid</th>
                  <th className="font-medium px-3 py-2">SAP</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-surface last:border-0 hover:bg-accent/30">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/promotions/${row.id}`}
                        className="text-[12.5px] font-medium text-primary whitespace-nowrap"
                      >
                        {row.code}
                      </Link>
                      {row.versionNumber != null && (
                        <span className="text-[10.5px] text-muted-foreground ml-1.5">v{row.versionNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-main">{row.name}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                      {BUSINESS_TYPE_LABELS[row.businessType] ?? row.businessType}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-main whitespace-nowrap">{rewardLabel(row)}</td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {when(row.validFrom)} – {when(row.validTo)}
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {row.sapConditionType ?? '—'}
                      {row.sapStatus && row.sapStatus !== 'NotSynced' && (
                        <span className="block text-[10.5px]">{row.sapStatus}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={row.status} />
                      {/* A live version behind an open one. Without this the row reads
                          as Draft while the discount is being given. */}
                      {row.liveVersionNumber != null && row.liveVersionNumber !== row.versionNumber && (
                        <span className="block text-[10.5px] text-emerald-700 mt-0.5">
                          v{row.liveVersionNumber} live
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && <CreatePromotionDialog onClose={() => setCreating(false)} />}
    </PageBody>
  );
}
