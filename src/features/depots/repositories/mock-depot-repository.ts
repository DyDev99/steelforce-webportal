import { crmDepots, myDepots } from '@/features/depots/data/crm';
import type { PageResult } from '@/infrastructure/repositories/types';
import type {
  CreateDepotInput,
  DepotSapOperations,
  Depot,
  DepotListQuery,
  DepotRepository,
  UpdateDepotInput,
} from './types';

/**
 * Development-only adapter. It exposes existing demo records through the same
 * interface a future API adapter will use; it never fabricates mutations.
 */
export class MockDepotRepository implements DepotRepository {
  async list(query: DepotListQuery = {}): Promise<PageResult<Depot>> {
    const term = query.search?.trim().toLocaleLowerCase();
    const source = query.scope === 'assigned' ? myDepots() : crmDepots;
    const filtered = source.filter((depot) => {
      if (query.status && depot.status !== query.status) return false;
      if (query.salesRepId && depot.repId !== query.salesRepId) return false;
      if (!term) return true;
      return [depot.name, depot.code, depot.email, depot.phone]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(term));
    });
    const pageSize = query.pageSize ?? query.limit ?? filtered.length;
    const page = query.page ?? 1;
    const start = Math.max(0, page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, nextCursor: null };
  }

  async getById(id: string): Promise<Depot | null> {
    return crmDepots.find((depot) => depot.id === id) ?? null;
  }

  async create(_input: CreateDepotInput): Promise<Depot> {
    throw new Error('Depot creation is unavailable in the static demo repository.');
  }

  async update(_id: string, _input: UpdateDepotInput): Promise<Depot> {
    throw new Error('Depot updates are unavailable in the static demo repository.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Depot deletion is unavailable in the static demo repository.');
  }

  // Lifecycle transitions change state the demo cannot persist. Throwing keeps the
  // demo honest: a button that appears to approve a depot and silently does nothing
  // is worse than one that reports it is unavailable.
  async submit(_id: string): Promise<void> {
    throw new Error('Submitting a depot is unavailable in the static demo repository.');
  }

  async approve(_id: string): Promise<void> {
    throw new Error('Approving a depot is unavailable in the static demo repository.');
  }

  async reject(_id: string, _reason: string): Promise<void> {
    throw new Error('Rejecting a depot is unavailable in the static demo repository.');
  }

  async suspend(_id: string, _reason?: string): Promise<void> {
    throw new Error('Suspending a depot is unavailable in the static demo repository.');
  }

  async reinstate(_id: string): Promise<void> {
    throw new Error('Reinstating a depot is unavailable in the static demo repository.');
  }

  async getByCode(code: string): Promise<Depot | null> {
    return crmDepots.find((depot) => depot.code === code) ?? null;
  }

  /**
   * SAP has no demo stand-in.
   *
   * `status` answers with zeros so a screen can render its panel without special
   * cases, but every *action* throws. A demo that appears to push registrations into
   * an ERP and silently does nothing is the one failure mode worth being loud about.
   */
  readonly sap: DepotSapOperations = {
    async status() {
      return {
        total: crmDepots.length,
        registered: 0,
        pending: 0,
        rejected: 0,
        notSubmitted: crmDepots.length,
        lastRegisteredAt: null,
        oldestPendingAt: null,
      };
    },
    async pullMasterData() {
      throw new Error('SAP synchronisation is unavailable in the static demo repository.');
    },
    async pullReferences() {
      throw new Error('SAP synchronisation is unavailable in the static demo repository.');
    },
    async pushPending() {
      throw new Error('SAP synchronisation is unavailable in the static demo repository.');
    },
    async retryRejected() {
      throw new Error('SAP synchronisation is unavailable in the static demo repository.');
    },
  };
}
