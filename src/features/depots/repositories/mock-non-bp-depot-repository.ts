import type { PageResult } from '@/infrastructure/repositories/types';
import type { NonBpDepot, NonBpDepotListQuery, NonBpDepotRepository } from './non-bp-types';

/**
 * Development-only adapter.
 *
 * Deliberately returns nothing rather than inventing prospects. The NON-BP list is a
 * work queue a manager acts on; a demo full of plausible shops that cannot be approved
 * teaches the wrong thing about the screen. An empty queue is a real state the screen
 * has to handle anyway.
 */
export class MockNonBpDepotRepository implements NonBpDepotRepository {
  async list(_query: NonBpDepotListQuery = {}): Promise<PageResult<NonBpDepot>> {
    return { items: [], total: 0, nextCursor: null };
  }
}
