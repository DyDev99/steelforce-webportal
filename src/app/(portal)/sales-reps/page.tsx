'use client';

/**
 * Sales Reps — the field team, from `/api/v1/admin/sales-reps`.
 *
 * ## What changed from the mock, and why
 *
 * This board previously rendered eight hard-coded people with invented revenue, order
 * counts, target percentages and star ratings. Those four figures are **not fabricated
 * here any more, and they are not displayed at all**, because the platform does not
 * store them: a representative is a user account, and their performance is counted live
 * from route stops. There is no revenue, no per-rep order count and no rating in any
 * table, and the backend contract refuses to invent them. Rendering a plausible number
 * in the browser instead would be the same lie told one layer further out.
 *
 * What replaced them is real and, for a supervisor, more useful: scheduled, completed
 * and missed calls over the window, the completion rate derived from those, and the
 * count of visits carrying a fraud flag.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/forms/search-bar';
import { FilterChip } from '@/components/forms/filter-chip';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Route,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  useSalesEmployees,
  useSalesRep,
  useSalesReps,
  type SalesRepDto,
} from '@/features/sales-reps';
import { SalesEmployeeRegister } from './sales-employee-register';

/** Two initials from a display name, for the avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A stable avatar colour per account.
 *
 * Hashed from the id rather than stored: an avatar colour is a rendering concern, and
 * the platform rightly has no column for it. The same person keeps the same colour
 * across reloads and across machines.
 */
const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-sky-500 to-sky-600',
  'from-green-500 to-green-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-indigo-500 to-indigo-600',
  'from-rose-500 to-rose-600',
  'from-teal-500 to-teal-600',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

/** Colour for a completion rate. Null (nothing scheduled) is neutral, never red. */
function rateTone(rate: number | null | undefined): string {
  if (rate == null) return 'text-gray-400';
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function rateBar(rate: number | null | undefined): string {
  if (rate == null) return 'bg-gray-200';
  if (rate >= 80) return 'gradient-primary';
  if (rate >= 60) return 'bg-gradient-to-r from-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-red-400 to-red-500';
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

/**
 * The screen's two registers.
 *
 * They are tabbed rather than merged because they answer different questions and are
 * not the same people. Merging them is exactly the confusion this page exists to
 * prevent: the field team is who can be given a route today; the SAP register is every
 * personnel number the ERP has ever sent.
 */
type Tab = 'reps' | 'employees';

export default function SalesRepsPage() {
  const [tab, setTab] = useState<Tab>('reps');

  // Both totals are fetched at the top so the tab labels can carry them. The employee
  // query asks for a single row: the count lives in the envelope's pagination block, so
  // a page size of one is enough to learn it without pulling a register.
  const repCount = useSalesReps({ pageNumber: 1, pageSize: 1 }).data?.totalCount;
  const employeeCount = useSalesEmployees({ pageNumber: 1, pageSize: 1 }).data?.totalCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-50 w-fit">
        {([
          { key: 'reps' as const, label: 'Field reps', count: repCount, hint: 'Accounts that can sign in and take a route' },
          { key: 'employees' as const, label: 'SAP employees', count: employeeCount, hint: "SAP's personnel register" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            title={t.hint}
            className={`px-4 py-2 rounded-xl text-[12px] font-600 transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 card-shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontWeight: 600 }}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 text-[11px] text-gray-400">{t.count.toLocaleString()}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'reps' ? <FieldRepsBoard /> : <SalesEmployeeRegister />}
    </div>
  );
}

function FieldRepsBoard() {
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const query = useMemo(
    () => ({
      pageNumber: 1,
      pageSize: 100,
      search: search.trim() || undefined,
      isActive: status === 'All' ? undefined : status === 'active',
    }),
    [search, status]
  );

  const { data, isLoading, error } = useSalesReps(query);
  const reps = data?.items ?? [];

  // Counted over the rows on screen, so the header cannot disagree with the list
  // beneath it. `totalCount` is the exception — it is the server's figure for the whole
  // filtered set, which is what "Total reps" should mean when a page is capped.
  const summary = useMemo(() => {
    const active = reps.filter((rep) => rep.isActive).length;
    const rated = reps.filter((rep) => rep.metrics.successRate != null);
    const avgRate = rated.length
      ? Math.round(rated.reduce((sum, rep) => sum + (rep.metrics.successRate ?? 0), 0) / rated.length)
      : null;
    const busiest = reps.reduce<SalesRepDto | null>(
      (best, rep) => (best && best.metrics.completedVisits >= rep.metrics.completedVisits ? best : rep),
      null
    );

    return { active, avgRate, busiest };
  }, [reps]);

  const window = reps[0]?.metrics;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Total reps',
            value: isLoading ? '—' : String(data?.totalCount ?? 0),
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Active accounts',
            value: isLoading ? '—' : String(summary.active),
            icon: UserCheck,
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
          {
            label: 'Avg. completion',
            value: isLoading ? '—' : summary.avgRate == null ? 'No data' : `${summary.avgRate}%`,
            icon: Target,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Most visits',
            value: isLoading
              ? '—'
              : summary.busiest && summary.busiest.metrics.completedVisits > 0
                ? summary.busiest.name
                : 'None yet',
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((s, i) => (
          <Card
            key={s.label}
            className="p-5 border-gray-100 card-shadow animate-fade-in-up opacity-0"
            style={{ borderRadius: '18px', animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg} mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-[12px] text-gray-400 font-500 mb-1" style={{ fontWeight: 500 }}>
              {s.label}
            </p>
            <p className="text-[20px] font-700 text-gray-900 truncate" style={{ fontWeight: 700 }}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name, e-mail or employee code…"
          className="w-full sm:w-80"
        />
        <FilterChip label="Status" value={status} options={STATUS_OPTIONS} icon={UserCheck} onChange={setStatus} />
        {window && (
          <span className="text-[11px] text-gray-400 ml-auto">
            Figures cover {format(new Date(window.from), 'd MMM')} – {format(new Date(window.to), 'd MMM yyyy')}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={24} />
          <p className="text-[12px]">Loading representatives…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="py-16 text-center text-red-500 text-[13px]">
          Failed to load representatives. Please try again.
        </div>
      )}

      {!isLoading && !error && reps.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-[13px]">
          No representatives match these filters.
        </div>
      )}

      {/* Rep cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {reps.map((rep, i) => {
          const expanded = selectedRepId === rep.id;
          const m = rep.metrics;

          return (
            <Card
              key={rep.id}
              onClick={() => setSelectedRepId(expanded ? null : rep.id)}
              className={`p-5 border-gray-100 card-shadow hover:card-shadow-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in-up opacity-0 ${
                expanded ? 'ring-2 ring-blue-200' : ''
              }`}
              style={{ borderRadius: '18px', animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientFor(rep.id)} flex items-center justify-center shadow-md`}
                    >
                      <span className="text-white text-sm font-700" style={{ fontWeight: 700 }}>
                        {initialsOf(rep.name)}
                      </span>
                    </div>
                    {/* Account status, not presence. The list endpoint carries no live
                        position, and a green dot that means "not suspended" must not be
                        read as "on the road right now". */}
                    <span
                      title={rep.isActive ? 'Account active' : 'Account suspended'}
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        rep.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-700 text-gray-900 truncate" style={{ fontWeight: 700 }}>
                      {rep.name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {rep.roles.length > 0 ? rep.roles.join(', ') : 'No role assigned'}
                    </p>
                  </div>
                </div>

                {m.flaggedVisits > 0 && (
                  <div
                    title={`${m.flaggedVisits} visit(s) carrying a fraud signal at High or above`}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-50 flex-shrink-0"
                  >
                    <AlertTriangle size={10} className="text-red-500" />
                    <span className="text-[10px] font-600 text-red-600" style={{ fontWeight: 600 }}>
                      {m.flaggedVisits}
                    </span>
                  </div>
                )}
              </div>

              {/* Territory */}
              <div className="flex items-center gap-1.5 mb-4">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-[11px] text-gray-500 truncate">{rep.zone || 'No territory assigned'}</span>
              </div>

              {/* Stats — every figure counted from route stops */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <Calendar size={14} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-[14px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                    {m.scheduledVisits}
                  </p>
                  <p className="text-[9px] text-gray-400">Scheduled</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <CheckCircle2 size={14} className="text-green-500 mx-auto mb-1" />
                  <p className="text-[14px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                    {m.completedVisits}
                  </p>
                  <p className="text-[9px] text-gray-400">Completed</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-gray-50">
                  <XCircle size={14} className="text-red-400 mx-auto mb-1" />
                  <p className="text-[14px] font-700 text-gray-900" style={{ fontWeight: 700 }}>
                    {m.missedVisits}
                  </p>
                  <p className="text-[9px] text-gray-400">Missed</p>
                </div>
              </div>

              {/* Completion rate — deliberately not called a target: nothing on this
                  platform sets one. This is completion against what was scheduled. */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-400 font-500" style={{ fontWeight: 500 }}>
                    Completion rate
                  </span>
                  <span className={`text-[11px] font-700 ${rateTone(m.successRate)}`} style={{ fontWeight: 700 }}>
                    {m.successRate == null ? 'Nothing scheduled' : `${m.successRate}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${rateBar(m.successRate)}`}
                    style={{ width: `${m.successRate ?? 0}%` }}
                  />
                </div>
              </div>

              {expanded && <RepDetail repId={rep.id} rep={rep} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The expanded panel: contact details, today's route and recent field activity.
 *
 * Fetched on expand rather than with the board. The detail call carries a route header
 * and twenty activity rows; pulling that for every card would be twenty-odd requests to
 * fill panels nobody opened.
 */
function RepDetail({ repId, rep }: { repId: string; rep: SalesRepDto }) {
  const { data, isLoading, error } = useSalesRep(repId);

  return (
    <div className="mt-4 pt-4 border-t border-gray-50 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      {/* Contact comes off the list row, so it shows immediately rather than waiting. */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <Phone size={12} className="text-blue-500 flex-shrink-0" />
        {rep.phoneNumber || <span className="text-gray-300">No number on file</span>}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500 min-w-0">
        <Mail size={12} className="text-blue-500 flex-shrink-0" />
        <span className="truncate">{rep.email || <span className="text-gray-300">No e-mail on file</span>}</span>
      </div>
      {rep.depotCode && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Building2 size={12} className="text-blue-500 flex-shrink-0" /> Depot {rep.depotCode}
        </div>
      )}

      {isLoading && (
        <div className="py-3 flex justify-center text-gray-400">
          <Loader2 className="animate-spin" size={16} />
        </div>
      )}

      {error && !isLoading && <p className="text-[11px] text-red-500 pt-1">Could not load the full record.</p>}

      {data && (
        <>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Calendar size={12} className="text-blue-500 flex-shrink-0" /> Joined{' '}
            {format(new Date(data.joinDate), 'd MMM yyyy')}
          </div>

          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Today&apos;s route</p>
            {data.activeRoute ? (
              <div className="flex items-start gap-2 text-[11px] text-gray-600">
                <Route size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{data.activeRoute.name}</span>
                  <span className="block text-gray-400">
                    {data.activeRoute.completedStopCount}/{data.activeRoute.stopCount} stops ·{' '}
                    {data.activeRoute.status}
                    {data.activeRoute.estimatedDistanceKm != null &&
                      ` · ~${data.activeRoute.estimatedDistanceKm} km`}
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-gray-300">No route planned for today</p>
            )}
          </div>

          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Recent activity</p>
            {data.recentActivity.length === 0 ? (
              <p className="text-[11px] text-gray-300">Nothing recorded yet</p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.slice(0, 5).map((event) => (
                  <div key={`${event.visitId}-${event.type}-${event.timestamp}`} className="flex items-center gap-2">
                    {event.type === 'missed' ? (
                      <XCircle size={11} className="text-red-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-gray-600 truncate min-w-0">
                      {event.customerName || event.customerId}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                      {format(new Date(event.timestamp), 'd MMM HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Button size="sm" className="w-full rounded-xl mt-2 gradient-primary text-white border-0" disabled>
        View full profile
      </Button>
    </div>
  );
}
