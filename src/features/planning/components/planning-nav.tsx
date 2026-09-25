'use client';

import { usePlanning } from '@/features/planning/store';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarRange,
  LayoutGrid,
  Map as MapIcon,
  ClipboardCheck,
  Users,
  Route,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/planning', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/planning/board', label: 'Assignment Board', icon: Route },
  { href: '/planning/stops', label: "Today's Stops", icon: CalendarRange },
  { href: '/planning/reps', label: 'Sales Reps', icon: Users },
  { href: '/planning/map', label: 'Live Map', icon: MapIcon },
  { href: '/planning/analytics', label: 'Reports', icon: BarChart3 },
];

export function PlanningNav() {
  const pathname = usePathname();
  const { setSummaryOpen, kpis, published } = usePlanning();

  return (
    <div className="flex items-center gap-3 mb-6">
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        {TABS.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-main'
              }`}
            >
              <tab.icon size={15} strokeWidth={isActive ? 2.4 : 1.9} />
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="planning-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-accent/50 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setSummaryOpen(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl gradient-primary text-white text-[12px] font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.97] transition-transform"
      >
        <ClipboardCheck size={14} />
        <span className="hidden sm:inline">Plan summary</span>
        <span className="px-1.5 py-px rounded-md bg-white/25 text-[10px] font-bold tabular-nums">
          {kpis.assigned}
        </span>
        {published && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
      </button>
    </div>
  );
}
