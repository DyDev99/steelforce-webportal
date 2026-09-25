'use client';

/**
 * The planning module's single source of state.
 *
 * ## Live, with a fixture fallback
 *
 * The board reads `/api/v1/admin/planning` through {@link usePlanningBoard}. When the
 * portal is built with no API base URL — a design review, a Storybook, a demo laptop —
 * it falls back to the seeded fixtures in `data/demo-data.ts` and says so through
 * {@link PlanningContextValue.live}. The fallback exists so the module renders
 * standalone; it is **not** a silent failover for a backend that is merely down. A
 * configured API that errors surfaces as {@link PlanningContextValue.error} and an empty
 * board, because a planner shown yesterday's fixtures as though they were today's route
 * will plan against them.
 *
 * ## Why the mutations are not optimistic
 *
 * Assigning a stop changes the KPI row, the rep's workload bar, the pool count and the
 * column that was dropped on. Patching four derived figures by hand is how a header
 * starts disagreeing with the list beneath it, and a planner who cannot trust the
 * numbers stops using the board. Every write invalidates and refetches instead; the
 * request is small and the board is one document.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  customersById,
  depotsById,
  depots,
  repsById,
  salesReps,
  stops as seedStops,
} from './data/demo-data';
import {
  hhmmToMinutes,
  minutesToHHMM,
  roadKm,
  routeDistanceKm,
  travelMinutes,
} from './lib/geo';
import { hasApiBaseUrl } from '@/config/environment';
import {
  candidateToStop,
  customerIdFromCandidate,
  depotIdFor,
  isCandidateId,
  toSalesRep,
  toStopView,
} from './adapters';
import {
  useAssignStop,
  useOptimizePlan,
  usePlanningBoard,
  usePlanningCandidates,
  useReorderStops,
  useUnassignStop,
} from './hooks';
import type { OptimizeStrategyWire } from './api';
import { toast } from 'sonner';
import type {
  OptimizeStrategy,
  PlanningFilters,
  SalesRep,
  Stop,
  StopView,
} from './types';

const DAY_START = '08:00';
const TIER_WEIGHT: Record<string, number> = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 };
const PRIORITY_WEIGHT: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** How much of the unscheduled pool the board holds in memory at once. */
const CANDIDATE_PAGE_SIZE = 100;

/**
 * The board's labels for the five orderings, mapped to the names the server knows.
 *
 * The optimisation runs server-side: nearest-neighbour needs every customer's pin and
 * the priority sort needs their visit history, and pulling the whole customer set into
 * a browser to sort forty stops is the wrong place to do it.
 */
const STRATEGY_WIRE: Record<OptimizeStrategy, OptimizeStrategyWire> = {
  Distance: 'distance',
  Priority: 'priority',
  'Customer Level': 'customerValue',
  'Planned Time': 'plannedTime',
  'Sales Territory': 'territory',
};

/** Today, as the date input and the API both spell it. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DEFAULT_FILTERS: PlanningFilters = {
  search: '',
  salesOrg: 'All',
  division: 'All',
  province: 'All',
  district: 'All',
  customerType: 'All',
  priority: 'All',
  repId: 'All',
  assignment: 'All',
  visitDate: todayIso(),
};

export interface RouteSummary {
  repId: string;
  stops: StopView[];
  distanceKm: number;
  travelMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
  finishTime: string;
  orderValue: number;
}

interface PlanningContextValue {
  stops: Stop[];
  stopViews: StopView[];
  filtered: StopView[];
  unassigned: StopView[];
  assigned: StopView[];
  reps: SalesRep[];
  filters: PlanningFilters;
  setFilter: <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;

  selectedStopId: string | null;
  selectStop: (id: string | null) => void;
  selectedStop: StopView | null;
  selectedRepId: string | null;
  selectRep: (id: string | null) => void;

  summaryOpen: boolean;
  setSummaryOpen: (open: boolean) => void;

  assignStop: (stopId: string, repId: string) => void;
  unassignStop: (stopId: string) => void;
  assignAllVisible: (repId: string) => number;
  reorderStop: (repId: string, stopId: string, targetIndex: number) => void;

  strategy: OptimizeStrategy;
  setStrategy: (s: OptimizeStrategy) => void;
  optimizing: boolean;
  optimize: (repId?: string) => Promise<number>;

  published: boolean;
  publish: () => Promise<void>;

  routeFor: (repId: string) => RouteSummary;
  workloadFor: (repId: string) => { count: number; capacity: number; ratio: number };
  kpis: {
    total: number;
    assigned: number;
    unassigned: number;
    completed: number;
    inProgress: number;
    repsWorking: number;
    coverage: number;
    avgDistance: number;
    totalDistance: number;
    plannedMinutes: number;
    orderValue: number;
  };
  lastAssignment: { stopId: string; repId: string; at: number } | null;

  /** False when the module is rendering the seeded fixtures rather than the API. */
  live: boolean;
  /** True while the board is being fetched for the first time on this date. */
  loading: boolean;
  /** Set when the configured API could not be read. The board is empty, not stale. */
  error: Error | null;
}

const PlanningContext = createContext<PlanningContextValue | null>(null);

function matches(view: StopView, f: PlanningFilters, repName: (id: string) => string): boolean {
  const c = view.customer;
  if (f.salesOrg !== 'All' && c.salesOrg !== f.salesOrg) return false;
  if (f.division !== 'All' && c.division !== f.division) return false;
  if (f.province !== 'All' && c.province !== f.province) return false;
  if (f.district !== 'All' && c.district !== f.district) return false;
  if (f.customerType !== 'All' && c.type !== f.customerType) return false;
  if (f.priority !== 'All' && view.priority !== f.priority) return false;
  if (f.repId !== 'All' && view.repId !== f.repId) return false;
  if (f.assignment === 'Assigned' && !view.repId) return false;
  if (f.assignment === 'Unassigned' && view.repId) return false;
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const haystack = `${c.name} ${c.code} ${c.district} ${c.province} ${c.type} ${
      view.repId ? repName(view.repId) : ''
    }`;
    if (!haystack.toLowerCase().includes(q)) return false;
  }
  return true;
}

/**
 * Re-times a fixture route: leave the depot at 08:00, drive, serve, repeat.
 *
 * Fixture-only. Live routes are timed by the server, which owns the planned windows and
 * keeps them stable across a reorder — see `RoutePlan.Resequence`.
 */
function retime(repId: string, ordered: Stop[]): Stop[] {
  if (ordered.length === 0) return ordered;
  const depot = depotsById[ordered[0].depotId] ?? depots[0];
  let clock = hhmmToMinutes(DAY_START);
  let from = { lat: depot.lat, lng: depot.lng };

  return ordered.map((stop, index) => {
    const customer = customersById[stop.customerId];
    const legKm = roadKm(from, customer);
    clock += travelMinutes(legKm);
    const plannedStart = minutesToHHMM(clock);
    clock += stop.estimatedMinutes;
    from = { lat: customer.lat, lng: customer.lng };
    return {
      ...stop,
      repId,
      seq: index + 1,
      plannedStart,
      distanceKm: Number(legKm.toFixed(1)),
    };
  });
}

/** Fixture-only ordering. The live board calls the server's optimiser instead. */
function sortByStrategy(list: Stop[], strategy: OptimizeStrategy, depotId: string): Stop[] {
  const depot = depotsById[depotId] ?? depots[0];
  const copy = [...list];

  switch (strategy) {
    case 'Priority':
      return copy.sort(
        (a, b) =>
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          a.distanceKm - b.distanceKm
      );
    case 'Customer Level':
      return copy.sort(
        (a, b) =>
          TIER_WEIGHT[customersById[a.customerId].tier] -
            TIER_WEIGHT[customersById[b.customerId].tier] ||
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
      );
    case 'Planned Time':
      return copy.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
    case 'Sales Territory':
      return copy.sort((a, b) => {
        const ca = customersById[a.customerId];
        const cb = customersById[b.customerId];
        return (
          ca.province.localeCompare(cb.province) ||
          ca.district.localeCompare(cb.district) ||
          a.distanceKm - b.distanceKm
        );
      });
    case 'Distance':
    default: {
      const remaining = [...copy];
      const ordered: Stop[] = [];
      let cursor = { lat: depot.lat, lng: depot.lng };
      while (remaining.length) {
        let bestIdx = 0;
        let bestKm = Infinity;
        remaining.forEach((s, i) => {
          const km = roadKm(cursor, customersById[s.customerId]);
          if (km < bestKm) {
            bestKm = km;
            bestIdx = i;
          }
        });
        const [next] = remaining.splice(bestIdx, 1);
        ordered.push(next);
        cursor = customersById[next.customerId];
      }
      return ordered;
    }
  }
}

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const live = hasApiBaseUrl();

  const [fixtureStops, setFixtureStops] = useState<Stop[]>(() => seedStops.map((s) => ({ ...s })));
  const [filters, setFilters] = useState<PlanningFilters>(DEFAULT_FILTERS);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [strategy, setStrategy] = useState<OptimizeStrategy>('Distance');
  const [optimizing, setOptimizing] = useState(false);
  const [published, setPublished] = useState(false);
  const [lastAssignment, setLastAssignment] = useState<
    { stopId: string; repId: string; at: number } | null
  >(null);

  const board = usePlanningBoard(filters.visitDate);
  const pool = usePlanningCandidates(
    {
      pageNumber: 1,
      pageSize: CANDIDATE_PAGE_SIZE,
      date: filters.visitDate,
      province: filters.province === 'All' ? undefined : filters.province,
      district: filters.district === 'All' ? undefined : filters.district,
      search: filters.search.trim() || undefined,
    },
    live
  );

  const assignMutation = useAssignStop();
  const unassignMutation = useUnassignStop();
  const reorderMutation = useReorderStops();
  const optimizeMutation = useOptimizePlan();

  // --- Data ---------------------------------------------------------------

  const reps = useMemo<SalesRep[]>(
    () => (live ? (board.data?.reps ?? []).map(toSalesRep) : salesReps),
    [live, board.data]
  );

  /** Which depot each rep's route is drawn from. Resolved once per board. */
  const depotByRep = useMemo(() => {
    const map: Record<string, string> = {};
    (board.data?.reps ?? []).forEach((rep) => {
      map[rep.id] = depotIdFor(rep.depotCode);
    });
    return map;
  }, [board.data]);

  /** The plan each rep's stops belong to — needed to address a reorder or an optimise. */
  const planByRep = useMemo(() => {
    const map: Record<string, string> = {};
    (board.data?.reps ?? []).forEach((rep) => {
      if (rep.planId) map[rep.id] = rep.planId;
    });
    return map;
  }, [board.data]);

  const repsById_ = useMemo(() => {
    const map: Record<string, SalesRep> = {};
    reps.forEach((rep) => {
      map[rep.id] = rep;
    });
    return map;
  }, [reps]);

  const stopViews = useMemo<StopView[]>(() => {
    if (!live) {
      return fixtureStops.map((s) => ({ ...s, customer: customersById[s.customerId] }));
    }

    const scheduled = (board.data?.stops ?? []).map((stop) =>
      toStopView(stop, depotByRep[stop.repId] ?? depots[0].id)
    );

    // The pool is customers, not stops — the backend has no unassigned stop, because a
    // stop is a row on somebody's route. They are projected into the same shape so the
    // board's left column, its filters and its drag source all stay one code path.
    const pooled = (pool.data?.items ?? []).map((candidate) =>
      candidateToStop(candidate.customer, depots[0].id)
    );

    return [...scheduled, ...pooled];
  }, [live, fixtureStops, board.data, pool.data, depotByRep]);

  const stops = useMemo<Stop[]>(
    () => stopViews.map(({ customer: _customer, ...rest }) => rest),
    [stopViews]
  );

  // --- Filtering ----------------------------------------------------------

  const repName = useCallback(
    (id: string) => repsById_[id]?.name ?? repsById[id]?.name ?? '',
    [repsById_]
  );

  const setFilter = useCallback(
    <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        // District options depend on province, so a province change would
        // otherwise leave an impossible district selected and empty the list.
        if (key === 'province') next.district = 'All';
        return next;
      });
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filtered = useMemo(
    () => stopViews.filter((v) => matches(v, filters, repName)),
    [stopViews, filters, repName]
  );

  const unassigned = useMemo(() => filtered.filter((s) => !s.repId), [filtered]);
  const assigned = useMemo(() => filtered.filter((s) => s.repId), [filtered]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    (Object.keys(DEFAULT_FILTERS) as Array<keyof PlanningFilters>).forEach((k) => {
      if (k === 'visitDate') return;
      if (k === 'search') {
        if (filters.search.trim()) n += 1;
        return;
      }
      if (filters[k] !== DEFAULT_FILTERS[k]) n += 1;
    });
    return n;
  }, [filters]);

  // --- Writes -------------------------------------------------------------

  const assignStop = useCallback(
    (stopId: string, repId: string) => {
      if (!live) {
        setFixtureStops((prev) => {
          const next = prev.map((s) =>
            s.id === stopId
              ? {
                  ...s,
                  repId,
                  status:
                    s.status === 'Completed' || s.status === 'In Progress'
                      ? s.status
                      : ('Assigned' as const),
                }
              : s
          );
          if (!repsById[repId]) return next;
          const route = next.filter((s) => s.repId === repId);
          const rest = next.filter((s) => s.repId !== repId);
          return [...rest, ...retime(repId, route)].sort((a, b) => a.id.localeCompare(b.id));
        });
        setPublished(false);
        setLastAssignment({ stopId, repId, at: Date.now() });
        return;
      }

      const existing = stopViews.find((s) => s.id === stopId);
      if (!existing) return;

      const customerId = isCandidateId(stopId) ? customerIdFromCandidate(stopId) : existing.customerId;

      // Moving a stop between representatives is a delete and an add, because the
      // server has no "move": a stop belongs to a route, and a route belongs to one
      // person. Done in that order so the customer is never on two days at once, which
      // the server refuses anyway.
      const move = async () => {
        if (!isCandidateId(stopId) && existing.repId && existing.repId !== repId) {
          await unassignMutation.mutateAsync(stopId);
        }
        await assignMutation.mutateAsync({
          repId,
          visitDate: filters.visitDate,
          customerId,
        });
      };

      move()
        .then(() => {
          setLastAssignment({ stopId, repId, at: Date.now() });
          toast.success('Stop assigned', {
            description: `${existing.customer.name} → ${repName(repId) || 'representative'}`,
          });
        })
        .catch((err: unknown) => {
          toast.error('Could not assign the stop', { description: describe(err) });
        });
    },
    [live, stopViews, filters.visitDate, assignMutation, unassignMutation, repName]
  );

  const unassignStop = useCallback(
    (stopId: string) => {
      if (!live) {
        setFixtureStops((prev) =>
          prev.map((s) =>
            s.id === stopId ? { ...s, repId: null, status: 'Unassigned' as const, seq: 0 } : s
          )
        );
        setPublished(false);
        return;
      }

      // A pooled customer has no server-side stop to delete; it is already unassigned.
      if (isCandidateId(stopId)) return;

      unassignMutation
        .mutateAsync(stopId)
        .then(() => toast.success('Stop removed from the route'))
        .catch((err: unknown) =>
          toast.error('Could not remove the stop', { description: describe(err) })
        );
    },
    [live, unassignMutation]
  );

  const assignAllVisible = useCallback(
    (repId: string) => {
      const targets = unassigned;
      if (targets.length === 0) return 0;

      if (!live) {
        const ids = targets.map((s) => s.id);
        setFixtureStops((prev) => {
          const next = prev.map((s) =>
            ids.includes(s.id) ? { ...s, repId, status: 'Assigned' as const } : s
          );
          const route = next.filter((s) => s.repId === repId);
          const rest = next.filter((s) => s.repId !== repId);
          return [...rest, ...retime(repId, route)].sort((a, b) => a.id.localeCompare(b.id));
        });
        setPublished(false);
        return ids.length;
      }

      // Sequentially, not in parallel: each assign appends to the same route, and the
      // server times a stop off the one currently last. Firing them together would race
      // on that read and produce a day where three calls share an arrival time.
      void (async () => {
        let done = 0;
        for (const stop of targets) {
          try {
            await assignMutation.mutateAsync({
              repId,
              visitDate: filters.visitDate,
              customerId: isCandidateId(stop.id)
                ? customerIdFromCandidate(stop.id)
                : stop.customerId,
            });
            done += 1;
          } catch {
            // Keep going: one customer already on another route must not stop the rest
            // of the column being filled. The count reported reflects what landed.
          }
        }
        toast.success(`Assigned ${done} of ${targets.length} stops`);
      })();

      return targets.length;
    },
    [live, unassigned, filters.visitDate, assignMutation]
  );

  const reorderStop = useCallback(
    (repId: string, stopId: string, targetIndex: number) => {
      if (!live) {
        setFixtureStops((prev) => {
          const route = prev.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq);
          const from = route.findIndex((s) => s.id === stopId);
          if (from === -1) return prev;
          const [moved] = route.splice(from, 1);
          route.splice(Math.max(0, Math.min(targetIndex, route.length)), 0, moved);
          const rest = prev.filter((s) => s.repId !== repId);
          return [...rest, ...retime(repId, route)].sort((a, b) => a.id.localeCompare(b.id));
        });
        setPublished(false);
        return;
      }

      const planId = planByRep[repId];
      if (!planId) return;

      const route = stopViews.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq);
      const from = route.findIndex((s) => s.id === stopId);
      if (from === -1) return;

      const order = route.map((s) => s.id);
      const [moved] = order.splice(from, 1);
      order.splice(Math.max(0, Math.min(targetIndex, order.length)), 0, moved);

      reorderMutation
        .mutateAsync({ planId, stopIds: order })
        .catch((err: unknown) =>
          toast.error('Could not reorder the route', { description: describe(err) })
        );
    },
    [live, planByRep, stopViews, reorderMutation]
  );

  const optimize = useCallback(
    async (repId?: string) => {
      if (!live) {
        setOptimizing(true);
        await new Promise((resolve) => setTimeout(resolve, 900));
        let touched = 0;
        setFixtureStops((prev) => {
          const targetIds = repId
            ? [repId]
            : Array.from(new Set(prev.map((s) => s.repId).filter(Boolean) as string[]));
          let next = [...prev];
          targetIds.forEach((rid) => {
            const route = next.filter((s) => s.repId === rid);
            if (route.length === 0) return;
            touched += route.length;
            const sorted = sortByStrategy(route, strategy, route[0].depotId);
            const rest = next.filter((s) => s.repId !== rid);
            next = [...rest, ...retime(rid, sorted)];
          });
          return next.sort((a, b) => a.id.localeCompare(b.id));
        });
        setOptimizing(false);
        setPublished(false);
        return touched;
      }

      const planIds = repId
        ? [planByRep[repId]].filter(Boolean)
        : Object.values(planByRep);

      if (planIds.length === 0) {
        toast.info('Nothing to optimise', { description: 'No routes are planned for this day.' });
        return 0;
      }

      setOptimizing(true);
      let moved = 0;

      for (const planId of planIds) {
        try {
          const result = await optimizeMutation.mutateAsync({
            planId,
            strategy: STRATEGY_WIRE[strategy],
          });
          moved += result.stopsMoved;
        } catch {
          // A route with nothing left to move answers a business-rule error. That is a
          // normal outcome when optimising the whole board late in the day, not a
          // failure worth interrupting the planner over.
        }
      }

      setOptimizing(false);
      toast.success(`Reordered ${moved} stops`, { description: `Strategy: ${strategy}` });
      return moved;
    },
    [live, planByRep, strategy, optimizeMutation]
  );

  const publish = useCallback(async () => {
    if (!live) {
      setPublished(true);
      toast.success('Routes published', { description: 'Fixture mode — nothing was sent.' });
      return;
    }

    // Assigning a stop creates the route already published, because a stop on an
    // unpublished route is invisible to the handset and the board gives a planner no
    // way to notice that. So there is nothing left for this button to send.
    const planned = Object.keys(planByRep).length;

    if (planned === 0) {
      toast.info('Nothing to publish', { description: 'Assign some stops first.' });
      return;
    }

    setPublished(true);
    toast.success('Routes are live', {
      description: `${planned} route${planned === 1 ? '' : 's'} already visible to the field team.`,
    });
  }, [live, planByRep]);

  // --- Derived ------------------------------------------------------------

  const routeFor = useCallback(
    (repId: string): RouteSummary => {
      const route = stopViews.filter((s) => s.repId === repId).sort((a, b) => a.seq - b.seq);
      const depotId = live ? depotByRep[repId] : route[0]?.depotId;
      const depot = (depotId ? depotsById[depotId] : undefined) ?? depots[0];
      const distanceKm = routeDistanceKm(depot, route.map((s) => s.customer));
      const drive = travelMinutes(distanceKm);
      const service = route.reduce((sum, s) => sum + s.estimatedMinutes, 0);
      const total = drive + service;
      return {
        repId,
        stops: route,
        distanceKm: Number(distanceKm.toFixed(1)),
        travelMinutes: drive,
        serviceMinutes: service,
        totalMinutes: total,
        finishTime: minutesToHHMM(hhmmToMinutes(DAY_START) + total),
        orderValue: route.reduce((sum, s) => sum + s.orderValue, 0),
      };
    },
    [stopViews, live, depotByRep]
  );

  const workloadFor = useCallback(
    (repId: string) => {
      const rep = repsById_[repId] ?? repsById[repId];
      const count = stopViews.filter((s) => s.repId === repId).length;
      const capacity = rep?.capacity ?? 10;
      return { count, capacity, ratio: capacity ? count / capacity : 0 };
    },
    [stopViews, repsById_]
  );

  const kpis = useMemo(() => {
    // Live figures come from the server, counted over exactly the rows it returned, so
    // the header cannot disagree with the list beneath it. The fixture branch counts
    // locally because there is nothing else to count.
    if (live && board.data) {
      const k = board.data.kpis;
      const scheduled = k.totalStops;
      const poolSize = pool.data?.totalCount ?? k.unscheduledCustomers;
      const total = scheduled + poolSize;

      return {
        total,
        assigned: scheduled,
        unassigned: poolSize,
        completed: k.completedStops,
        inProgress: k.inProgressStops,
        repsWorking: k.repsWithRoutes,
        coverage: total ? Math.round((scheduled / total) * 100) : 0,
        avgDistance: k.averageDistanceKm ?? 0,
        totalDistance: Math.round(k.totalDistanceKm),
        plannedMinutes: k.plannedMinutes,
        // The platform does not forecast order value per stop; see UNMODELLED_FIELDS in
        // adapters.ts. Zero rather than a plausible-looking figure nobody computed.
        orderValue: 0,
      };
    }

    const total = stops.length;
    const assignedCount = stops.filter((s) => s.repId).length;
    const completed = stops.filter((s) => s.status === 'Completed').length;
    const inProgress = stops.filter((s) => s.status === 'In Progress').length;
    const activeRepIds = new Set(stops.filter((s) => s.repId).map((s) => s.repId as string));
    const totalDistance = stops.reduce((sum, s) => sum + s.distanceKm, 0);
    const plannedMinutes = stops.reduce((sum, s) => sum + s.estimatedMinutes, 0);

    return {
      total,
      assigned: assignedCount,
      unassigned: total - assignedCount,
      completed,
      inProgress,
      repsWorking: activeRepIds.size,
      coverage: total ? Math.round((assignedCount / total) * 100) : 0,
      avgDistance: total ? Number((totalDistance / total).toFixed(1)) : 0,
      totalDistance: Number(totalDistance.toFixed(0)),
      plannedMinutes,
      orderValue: stops.reduce((sum, s) => sum + s.orderValue, 0),
    };
  }, [live, board.data, pool.data, stops]);

  const selectedStop = useMemo(
    () => stopViews.find((s) => s.id === selectedStopId) ?? null,
    [stopViews, selectedStopId]
  );

  const value = useMemo<PlanningContextValue>(
    () => ({
      stops,
      stopViews,
      filtered,
      unassigned,
      assigned,
      reps,
      filters,
      setFilter,
      resetFilters,
      activeFilterCount,
      selectedStopId,
      selectStop: setSelectedStopId,
      selectedStop,
      selectedRepId,
      selectRep: setSelectedRepId,
      summaryOpen,
      setSummaryOpen,
      assignStop,
      unassignStop,
      assignAllVisible,
      reorderStop,
      strategy,
      setStrategy,
      optimizing,
      optimize,
      published,
      publish,
      routeFor,
      workloadFor,
      kpis,
      lastAssignment,
      live,
      loading: live && (board.isLoading || pool.isLoading),
      error: live ? ((board.error as Error | null) ?? null) : null,
    }),
    [
      stops, stopViews, filtered, unassigned, assigned, reps, filters, setFilter, resetFilters,
      activeFilterCount, selectedStopId, selectedStop, selectedRepId, summaryOpen,
      assignStop, unassignStop, assignAllVisible, reorderStop, strategy, optimizing,
      optimize, published, publish, routeFor, workloadFor, kpis, lastAssignment,
      live, board.isLoading, board.error, pool.isLoading,
    ]
  );

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

/** Pulls a readable message off whatever the API layer threw. */
function describe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'The server refused the change.';
}

export function usePlanning(): PlanningContextValue {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error('usePlanning must be used within a PlanningProvider');
  return ctx;
}
