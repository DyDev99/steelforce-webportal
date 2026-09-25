'use client';

import { useMemo } from 'react';
import {
  Building2,
  CalendarDays,
  DollarSign,
  FileText,
  ShoppingCart,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  customerGrowthData,
  ordersData,
  provinceData,
  quotationConversion,
  recentOrders,
  salesRevenueData,
} from '../data/overview';

/**
 * The one dashboard read.
 *
 * Every shell's overview calls this and nothing else, so switching layout
 * cannot double a request — there is a single call site to point at the API
 * when it lands, and React Query will dedupe it from there. The KPI and summary
 * rows are built here rather than in `data/` because their labels are
 * translated, and `data/` stays free of React.
 */
export function useOverview() {
  const { t } = useI18n();

  const stats = useMemo(
    () => [
      { title: t('stat.todaySales'), value: 48250, prefix: '$', trend: 12.5, icon: DollarSign, iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-500/10', sparkData: [30, 45, 38, 52, 48, 60, 72], sparkColor: '#004A98' },
      { title: t('stat.monthlyRevenue'), value: 1284500, prefix: '$', trend: 8.2, icon: CalendarDays, iconColor: 'text-sky-500 dark:text-sky-400', iconBg: 'bg-sky-50 dark:bg-sky-500/10', sparkData: [60, 72, 68, 80, 75, 88, 95], sparkColor: '#4F92DA' },
      { title: t('stat.activeSalesReps'), value: 24, trend: 4.1, icon: UserCheck, iconColor: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50 dark:bg-green-500/10', sparkData: [18, 20, 19, 22, 21, 23, 24], sparkColor: '#2C9942' },
      { title: t('stat.customersVisited'), value: 156, trend: 6.8, icon: Users, iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-500/10', sparkData: [100, 120, 110, 130, 125, 140, 156], sparkColor: '#D47C17' },
      { title: t('stat.pendingOrders'), value: 38, trend: -2.3, icon: ShoppingCart, iconColor: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-50 dark:bg-orange-500/10', sparkData: [45, 42, 48, 40, 44, 41, 38], sparkColor: '#C0362C' },
      { title: t('stat.pendingQuotations'), value: 52, trend: 3.5, icon: FileText, iconColor: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', sparkData: [40, 45, 42, 48, 50, 49, 52], sparkColor: '#2F4FAE' },
      { title: t('stat.collectionToday'), value: 32500, prefix: '$', trend: 15.2, icon: Wallet, iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', sparkData: [20, 25, 22, 28, 30, 32, 32.5], sparkColor: '#2C9942' },
      { title: t('stat.totalCustomers'), value: 1240, trend: 5.0, icon: Building2, iconColor: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-500/10', sparkData: [1000, 1050, 1100, 1150, 1180, 1210, 1240], sparkColor: '#5E53AE' },
    ],
    [t]
  );

  const performanceSummary = useMemo(
    () => [
      { label: t('chart.conversionRate'), value: '68.5%', trend: 'up' as const },
      { label: 'Avg. Order Value', value: '$24,580', trend: 'up' as const },
      { label: 'Customer Retention', value: '84.2%', trend: 'up' as const },
      { label: 'Visit Success Rate', value: '72.0%', trend: 'down' as const },
      { label: 'Quotation Acceptance', value: '55.8%', trend: 'up' as const },
      { label: 'Collection Rate', value: '91.3%', trend: 'up' as const },
    ],
    [t]
  );

  return {
    stats,
    performanceSummary,
    salesRevenueData,
    ordersData,
    quotationConversion,
    customerGrowthData,
    provinceData,
    recentOrders,
  };
}

export type OverviewStat = ReturnType<typeof useOverview>['stats'][number];
