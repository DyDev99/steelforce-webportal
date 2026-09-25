'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  TrendingUp,
  Wallet,
  ShoppingCart,
  FileText,
  Activity,
  DollarSign,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { nonBpDepotsRepository, type NonBpDepot } from '@/features/depots';
import { useRepositoryQuery } from '@/hooks/use-repository-query';
import { ErrorState } from '@/components/feedback/feedback';

/** The endpoint clamps at 1,000; 200 fills the grid in one request. */
const PAGE_SIZE = 200;

/** Stable empty page, so an unresolved query does not remount the list each render. */
const NO_PROSPECTS: NonBpDepot[] = [];

/** Initials for the avatar tile, from whatever the record is actually called. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


const tabs = ['Overview', 'Orders', 'Quotations', 'Visits', 'Payments', 'Activities'];

export default function NonBpDepotsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  // Typing must not fire a request per keystroke against the prospect queue.
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProspects = useCallback(
    (signal: AbortSignal) =>
      nonBpDepotsRepository.list(
        { page: pageNumber, pageSize: PAGE_SIZE, search: appliedSearch || undefined },
        signal
      ),
    [pageNumber, appliedSearch]
  );
  const { data: page, error, isLoading, refetch } = useRepositoryQuery(
    ['non-bp-depots', pageNumber, appliedSearch],
    loadProspects
  );

  // Searching and paging are the server's job; filtering one page here and calling it
  // the answer is how a list that looks complete stops being complete.
  const filtered = page?.items ?? NO_PROSPECTS;
  const total = page?.total ?? filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selection by identity: the list reloads, so an index can outlive its row.
  const selectedDepot = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search depots..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-gray-100 card-shadow text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
          />
        </div>
        <Button size="sm" className="rounded-xl gradient-primary text-white border-0">
          <Plus size={15} className="mr-1.5" /> Add Depot
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="Could not load NON-BP depots"
          body="The prospect queue is unavailable. Check your connection and try again."
          onRetry={refetch}
        />
      ) : null}

      {!error && isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-[86px] rounded-card" />
            ))}
          </div>
          <div className="lg:col-span-2 skeleton h-[420px] rounded-card" />
        </div>
      )}

      {!error && !isLoading && filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-surface py-12 text-center">
          <p className="text-[13px] font-semibold text-main">No NON-BP depots</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {appliedSearch
              ? 'Nothing matches that search.'
              : 'Nothing is waiting. Prospects appear here once a representative captures one in the field.'}
          </p>
        </div>
      )}

      {!error && !isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{' '}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span> prospects
            {appliedSearch ? ` matching “${appliedSearch}”` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-md"
              disabled={pageNumber <= 1 || isLoading}
              onClick={() => setPageNumber((n) => Math.max(1, n - 1))}>Previous</Button>
            <span className="text-[12px] text-muted-foreground">
              Page {pageNumber} of {lastPage.toLocaleString()}
            </span>
            <Button size="sm" variant="outline" className="rounded-md"
              disabled={pageNumber >= lastPage || isLoading}
              onClick={() => setPageNumber((n) => n + 1)}>Next</Button>
          </div>
        </div>
      )}

      {!error && !isLoading && filtered.length > 0 && selectedDepot && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Depot List */}
        <div className="space-y-3">
          {filtered.map((c, i) => (
            <Card
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`p-4 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0 ${selectedDepot?.id === c.id ? 'ring-2 ring-blue-200' : ''}`}
              style={{ borderRadius: '16px', animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white text-[13px] font-700" style={{ fontWeight: 700 }}>{initialsOf(c.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>{c.name}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {c.city || c.province || '—'} · {c.code ?? 'No code'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400">Outstanding</p>
                  <p className="text-[12px] font-700 text-gray-700" style={{ fontWeight: 700 }}>
                    {c.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Lifetime Revenue</p>
                  <p className="text-[12px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{c.estimatedPotential ? `$${c.estimatedPotential.toLocaleString()}` : '—'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Depot Detail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Card */}
          <Card className="p-6 border-gray-100 card-shadow animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0`}>
                <span className="text-white text-xl font-700" style={{ fontWeight: 700 }}>{initialsOf(selectedDepot.name)}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-[18px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{selectedDepot.name}</h2>
                <p className="text-[12px] text-gray-400 mb-2">{selectedDepot.code ?? 'No SAP code — not a business partner'}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Phone size={12} className="text-blue-500" /> {selectedDepot.phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {selectedDepot.city || selectedDepot.province || '—'}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} className="text-blue-500" /> {selectedDepot.outletType ?? 'Prospect'}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                // A prospect has never traded, so there is no ledger to show. Credit
                // limit, outstanding and lifetime revenue are all zero by definition,
                // and three zeroes read as a data fault rather than as "not a customer
                // yet". These are the facts the record actually holds.
                { label: 'Est. potential', value: selectedDepot.estimatedPotential ? `$${(selectedDepot.estimatedPotential / 1000).toFixed(0)}k` : '—', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Status', value: selectedDepot.status, icon: Wallet, color: selectedDepot.status === 'Approved' ? 'text-green-600' : selectedDepot.status === 'Rejected' ? 'text-rose-600' : 'text-amber-600', bg: selectedDepot.status === 'Approved' ? 'bg-green-50' : selectedDepot.status === 'Rejected' ? 'bg-rose-50' : 'bg-amber-50' },
                { label: 'Target product', value: selectedDepot.targetProduct ?? '—', icon: CreditCard, color: 'text-gray-700', bg: 'bg-gray-50' },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-2xl bg-gray-50/50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg} mb-2`}>
                    <s.icon size={15} className={s.color} />
                  </div>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                  <p className="text-[15px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabs */}
          <Card className="border-gray-100 card-shadow animate-fade-in-up opacity-0 overflow-hidden" style={{ borderRadius: '18px', animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-50 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-2.5 rounded-t-xl text-[12px] font-600 whitespace-nowrap transition-all duration-200 relative
                    ${activeTab === tab ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                  `}
                  style={{ fontWeight: 600 }}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-5">
              {activeTab === 'Overview' && (
                <div className="space-y-4 animate-fade-in">
                  {[
                    { label: 'Total Orders', value: '42', icon: ShoppingCart, color: 'text-blue-600' },
                    { label: 'Active Quotations', value: '3', icon: FileText, color: 'text-amber-600' },
                    { label: 'Total Visits', value: '18', icon: MapPin, color: 'text-green-600' },
                    { label: 'Payments (YTD)', value: '$1.2M', icon: DollarSign, color: 'text-sky-600' },
                    { label: 'Last Activity', value: '2 hours ago', icon: Activity, color: 'text-purple-600' },
                    { label: 'Account Status', value: 'Active', icon: CheckCircle2Icon, color: 'text-green-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-[12px] text-gray-500 font-500 flex items-center gap-2" style={{ fontWeight: 500 }}>
                        <item.icon size={14} className={item.color} /> {item.label}
                      </span>
                      <span className="text-[13px] font-700 text-gray-900" style={{ fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'Orders' && (
                <div className="space-y-2 animate-fade-in">
                  {['ORD-2845', 'ORD-2837', 'ORD-2830', 'ORD-2825'].map((oid, i) => (
                    <div key={oid} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className="text-[12px] font-700 text-blue-600" style={{ fontWeight: 700 }}>{oid}</span>
                      <span className="text-[12px] text-gray-500">Aug {6 - i}, 2026</span>
                      <span className="text-[12px] font-600 text-gray-900" style={{ fontWeight: 600 }}>${[24500, 61200, 38500, 15800][i]}</span>
                      <span className="text-[10px] font-600 px-2 py-0.5 rounded-md bg-green-50 text-green-600" style={{ fontWeight: 600 }}>Completed</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab !== 'Overview' && activeTab !== 'Orders' && (
                <div className="text-center py-12 text-gray-400 text-[13px] animate-fade-in">
                  {activeTab} data will appear here
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}

function CheckCircle2Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
