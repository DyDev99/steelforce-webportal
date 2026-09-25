'use client';

import { useLayout } from '@/lib/layout/layout-context';
import { EcosystemOverview, ModularOverview, WorkspaceOverview } from '@/features/dashboard';

/**
 * One route, one dataset, three presentations.
 *
 * Every view calls `useOverview()` and nothing else, so switching workspace
 * shell re-presents the same numbers rather than fetching them again. The page
 * itself holds no data and no business logic — it only chooses a composition.
 */
export default function DashboardPage() {
  const { layout } = useLayout();

  switch (layout) {
    case 'ecosystem':
      return <EcosystemOverview />;
    case 'modular':
      return <ModularOverview />;
    case 'workspace':
    default:
      return <WorkspaceOverview />;
  }
}
