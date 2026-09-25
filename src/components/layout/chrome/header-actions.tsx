'use client';

import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * Notifications, language, theme and the session menu.
 *
 * Lifted out of `Header` unchanged in behaviour, because every shell needs the
 * same set in the same order. `profileMenu` stays a slot: shared chrome must
 * not import from a feature (see docs/skills/folder-structure.md), so the
 * portal layout keeps owning that wiring.
 */
export function HeaderActions({ profileMenu }: { profileMenu?: React.ReactNode }) {
  const { t } = useI18n();
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">


      <div className="relative">
        <button
          type="button"
          onClick={() => setShowNotif((v) => !v)}
          aria-label={t('header.notifications')}
          aria-expanded={showNotif}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-accent" />
        </button>

        <AnimatePresence>
          {showNotif && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotif(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-11 z-50 w-80 rounded-card border border-border bg-popover p-3 shadow-isi-lg"
              >
                <p className="mb-2 text-[12px] font-bold text-foreground">
                  {t('header.notifications')}
                </p>
                <div className="space-y-1">
                  {[
                    { title: t('notif.orderApproved'), desc: t('notif.orderApprovedDesc'), time: '2m' },
                    { title: t('notif.quotationRejected'), desc: t('notif.quotationRejectedDesc'), time: '1h' },
                    { title: t('notif.lowStock'), desc: t('notif.lowStockDesc'), time: '2h' },
                  ].map((n) => (
                    <div
                      key={n.title}
                      className="flex cursor-pointer items-start gap-2.5 rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotif(false)}
                  className="mt-2 flex items-center justify-center gap-1.5 border-t border-border pt-2.5 text-[11.5px] font-medium text-primary hover:underline"
                >
                  {t('header.viewAllNotifications')} <ChevronRight size={12} />
                </Link>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>


      {profileMenu}
    </div>
  );
}
