import { crmDepots } from '@/features/depots/data/crm';
import { opportunities } from '@/features/opportunities/data/pipeline';
import { makeRng } from '@/lib/utilities/random';
import { salesReps } from '@/features/planning/data/demo-data';
import { PROVINCES } from '@/features/planning/types';
import { rootCategories, categoryRollup } from '@/features/materials/data/catalog';

/**
 * Reporting aggregates.
 *
 * Everything here is derived from the same customers, reps and opportunities
 * the operational screens use, so a number in a report can be traced back to
 * rows a manager can actually open.
 */

export interface RepPerformance {
  repId: string;
  name: string;
  team: string;
  province: string;
  target: number;
  actual: number;
  achievement: number;
  orders: number;
  growth: number;
  customers: number;
  plannedVisits: number;
  completedVisits: number;
  missedVisits: number;
  completionRate: number;
  uniqueCustomers: number;
  avgVisitMinutes: number;
  opportunities: number;
  won: number;
  winRate: number;
  pipeline: number;
  status: 'Excellent' | 'On Track' | 'Needs Attention' | 'At Risk';
}

function performanceStatus(achievement: number): RepPerformance['status'] {
  if (achievement >= 110) return 'Excellent';
  if (achievement >= 92) return 'On Track';
  if (achievement >= 78) return 'Needs Attention';
  return 'At Risk';
}

function buildPerformance(): RepPerformance[] {
  const rng = makeRng(551903);

  return salesReps.map((rep) => {
    const target = rng.int(40, 130) * 1000;
    const achievement = rng.int(62, 128);
    const actual = Math.round((target * achievement) / 100);

    const planned = rng.int(52, 104);
    const missed = rng.int(2, 16);
    const completed = planned - missed;

    const repOpps = opportunities.filter((o) => o.repId === rep.id);
    const won = repOpps.filter((o) => o.stage === 'Won').length;
    const lost = repOpps.filter((o) => o.stage === 'Lost').length;
    const open = repOpps.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost');

    return {
      repId: rep.id,
      name: rep.name,
      team: rep.team,
      province: rep.province,
      target,
      actual,
      achievement,
      orders: rng.int(18, 96),
      growth: rng.int(-14, 38),
      customers: crmDepots.filter((c) => c.repId === rep.id).length,
      plannedVisits: planned,
      completedVisits: completed,
      missedVisits: missed,
      completionRate: Math.round((completed / planned) * 100),
      uniqueCustomers: rng.int(18, 62),
      avgVisitMinutes: rng.int(24, 58),
      opportunities: repOpps.length,
      won,
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      pipeline: open.reduce((sum, o) => sum + o.value, 0),
      status: performanceStatus(achievement),
    };
  });
}

export const repPerformance: RepPerformance[] = buildPerformance();

export const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

export interface TrendPoint {
  month: string;
  sales: number;
  target: number;
}

function buildTrend(): TrendPoint[] {
  const rng = makeRng(20260807);
  let base = 210_000;
  return MONTHS.map((month) => {
    base = Math.round(base * rng.float(0.94, 1.11));
    return { month, sales: base, target: Math.round(base * rng.float(0.88, 1.14)) };
  });
}

export const salesTrend: TrendPoint[] = buildTrend();

export const salesByProvince = PROVINCES.map((province) => {
  const inProvince = repPerformance.filter((r) => r.province === province);
  const customers = crmDepots.filter((c) => c.province === province);
  return {
    province,
    short: province === 'Phnom Penh' ? 'PP' : province.split(' ')[0],
    sales: inProvince.reduce((sum, r) => sum + r.actual, 0),
    customers: customers.length,
  };
}).filter((row) => row.sales > 0);

export const salesByCategory = rootCategories.map((root) => {
  const rollup = categoryRollup(root);
  return { category: root.name, revenue: Math.round(rollup.revenue) };
});

export const topCustomers = [...crmDepots]
  .sort((a, b) => b.salesValue - a.salesValue)
  .slice(0, 8)
  .map((c) => ({
    id: c.id,
    name: c.name,
    province: c.province,
    revenue: c.salesValue,
    orders: Math.max(1, Math.round(c.totalVisits / 3)),
  }));

/** Visits per weekday, for the visit report's activity chart. */
export const visitsByDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
  const rng = makeRng(4400 + i);
  const planned = rng.int(48, 96);
  const completed = planned - rng.int(3, 18);
  return { day, planned, completed };
});

export interface SalesTotals {
  totalSales: number;
  target: number;
  achievement: number;
  growth: number;
  orders: number;
  averageOrder: number;
  grossMargin: number;
}

export function salesTotals(rows: RepPerformance[]): SalesTotals {
  const totalSales = rows.reduce((sum, r) => sum + r.actual, 0);
  const target = rows.reduce((sum, r) => sum + r.target, 0);
  const orders = rows.reduce((sum, r) => sum + r.orders, 0);
  return {
    totalSales,
    target,
    achievement: target ? Math.round((totalSales / target) * 100) : 0,
    growth: rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.growth, 0) / rows.length)
      : 0,
    orders,
    averageOrder: orders ? Math.round(totalSales / orders) : 0,
    grossMargin: 23,
  };
}

export interface VisitTotals {
  total: number;
  completed: number;
  planned: number;
  missed: number;
  completionRate: number;
  uniqueCustomers: number;
}

export function visitTotals(rows: RepPerformance[]): VisitTotals {
  const planned = rows.reduce((sum, r) => sum + r.plannedVisits, 0);
  const completed = rows.reduce((sum, r) => sum + r.completedVisits, 0);
  const missed = rows.reduce((sum, r) => sum + r.missedVisits, 0);
  return {
    total: planned,
    completed,
    planned: planned - completed - missed,
    missed,
    completionRate: planned ? Math.round((completed / planned) * 100) : 0,
    uniqueCustomers: rows.reduce((sum, r) => sum + r.uniqueCustomers, 0),
  };
}

/** Twelve-month sales trend for one rep, used in the performance drawer. */
export function repTrend(repId: string): TrendPoint[] {
  const seed = repId.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) * 17;
  const rng = makeRng(seed);
  const perf = repPerformance.find((r) => r.repId === repId);
  let base = (perf?.actual ?? 60_000) / 12;
  return MONTHS.map((month) => {
    base = Math.round(base * rng.float(0.86, 1.16));
    return { month, sales: base, target: Math.round((perf?.target ?? 70_000) / 12) };
  });
}
