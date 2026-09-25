'use client';

import { Command, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * The portal's global search field. Extracted from `Header` so all three shells
 * present one search affordance rather than three near-identical inputs.
 */
export function GlobalSearch({ className = '' }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={`group relative w-full ${className}`}>
      <Search
        size={17}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
      <input
        type="search"
        placeholder={t('header.search')}
        aria-label={t('header.search')}
        className="h-10 w-full rounded-md border border-border bg-background/60 pl-10 pr-14 text-[13px] text-foreground transition-all duration-med ease-standard placeholder:text-muted-foreground focus:border-primary/30 focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:flex">
        <Command size={9} />K
      </kbd>
    </div>
  );
}
