'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

const orders = [
  { id: 'ORD-2845', customer: 'Pars Steel Co.', rep: 'Ahmad Reza', date: 'Aug 6, 2026', status: 'Confirmed', total: 24500, payment: 'Paid' },
  { id: 'ORD-2844', customer: 'Mobarakeh Steel', rep: 'Sara Karimi', date: 'Aug 6, 2026', status: 'Processing', total: 38200, payment: 'Pending' },
  { id: 'ORD-2843', customer: 'Hormozgan Steel', rep: 'Mehdi Ahmadi', date: 'Aug 5, 2026', status: 'Completed', total: 52100, payment: 'Paid' },
  { id: 'ORD-2842', customer: 'Khouzestan Steel', rep: 'Reza Mohammadi', date: 'Aug 5, 2026', status: 'Pending', total: 18900, payment: 'Unpaid' },
  { id: 'ORD-2841', customer: 'Esfahan Steel Co.', rep: 'Niloofar S.', date: 'Aug 4, 2026', status: 'Cancelled', total: 9800, payment: 'Refunded' },
  { id: 'ORD-2840', customer: 'Ghadir Steel', rep: 'Omid Farahi', date: 'Aug 4, 2026', status: 'Confirmed', total: 31200, payment: 'Paid' },
  { id: 'ORD-2839', customer: 'Niru Steel', rep: 'Leila Hosseini', date: 'Aug 3, 2026', status: 'Processing', total: 44500, payment: 'Partial' },
  { id: 'ORD-2838', customer: 'Pasargad Steel', rep: 'Kian Mehrabi', date: 'Aug 3, 2026', status: 'Completed', total: 27800, payment: 'Paid' },
  { id: 'ORD-2837', customer: 'Mapna Steel', rep: 'Ahmad Reza', date: 'Aug 2, 2026', status: 'Completed', total: 61200, payment: 'Paid' },
  { id: 'ORD-2836', customer: 'Bahman Steel', rep: 'Sara Karimi', date: 'Aug 2, 2026', status: 'Pending', total: 15600, payment: 'Unpaid' },
];

const statusColors: Record<string, string> = {
  Confirmed: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  Processing: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Completed: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  Pending: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  Cancelled: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

const paymentColors: Record<string, string> = {
  Paid: 'text-green-600 dark:text-green-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Unpaid: 'text-red-600 dark:text-red-400',
  Refunded: 'text-muted-foreground',
  Partial: 'text-sky-600 dark:text-sky-400',
};

const statusFilterKeys = ['filter.all', 'status.pending', 'status.confirmed', 'status.processing', 'status.completed', 'status.cancelled'];
const statusFilterValues = ['All', 'Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled'];

export default function OrdersPage() {
  const { t, formatCurrency } = useI18n();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = orders.filter((o) => {
    const matchStatus = activeFilter === 'All' || o.status === activeFilter;
    const matchSearch = !search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <Card className="p-4 border-surface card-shadow" style={{ borderRadius: '18px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search.orders')}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/50 border border-surface text-[13px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {statusFilterKeys.map((key, i) => {
              const value = statusFilterValues[i];
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(value)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                    activeFilter === value ? 'gradient-primary text-white shadow-md shadow-blue-200/50' : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]">
              <SlidersHorizontal size={14} className="mr-1.5" /> {t('filter.filters')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]">
              <FileSpreadsheet size={14} className="mr-1.5" /> {t('button.excel')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]">
              <FileText size={14} className="mr-1.5" /> {t('button.pdf')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="border-surface card-shadow overflow-hidden" style={{ borderRadius: '18px' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.orderNumber')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.customer')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 hidden md:table-cell">{t('table.salesRep')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 hidden lg:table-cell">{t('table.date')}</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.status')}</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.total')}</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 hidden md:table-cell">{t('table.payment')}</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="border-t border-surface hover:bg-accent/20 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-semibold text-primary">{order.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-medium text-main">{order.customer}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-[12px] text-muted-foreground">{order.rep}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-[12px] text-muted-foreground">{order.date}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[order.status]}`}>
                      {t(`status.${order.status.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[12px] font-bold text-main">{formatCurrency(order.total)}</span>
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <span className={`text-[12px] font-medium ${paymentColors[order.payment]}`}>
                      {t(`status.${order.payment.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="w-8 h-8 rounded-lg hover:bg-accent/50 inline-flex items-center justify-center text-muted-foreground transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface">
          <p className="text-[11px] text-muted-foreground">
            {t('table.showing')} <span className="font-semibold text-main">1-{filtered.length}</span> {t('table.of')} <span className="font-semibold text-main">284</span> {t('table.orders')}
          </p>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 disabled:opacity-40 transition-colors" disabled>
              <ChevronLeft size={16} />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${p === 1 ? 'gradient-primary text-white' : 'text-muted-foreground hover:bg-accent/50'}`}
              >
                {p}
              </button>
            ))}
            <span className="text-muted-foreground px-1">...</span>
            <button className="w-8 h-8 rounded-lg text-[12px] font-semibold text-muted-foreground hover:bg-accent/50">29</button>
            <button className="w-8 h-8 rounded-lg border border-surface flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
