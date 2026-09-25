import { environment } from '@/config/environment';
import { sessionStore } from '@/infrastructure/storage/session-store';
import { ApiDepotRepository } from './api-depot-repository';
import { ApiNonBpDepotRepository } from './api-non-bp-depot-repository';
import { MockDepotRepository } from './mock-depot-repository';
import { MockNonBpDepotRepository } from './mock-non-bp-depot-repository';
import type { DepotRepository } from './types';
import type { NonBpDepotRepository } from './non-bp-types';

export { AWAITING_DECISION, DEPOT_LIFECYCLE } from './types';

export type {
  CreateDepotInput,
  DepotLifecycle,
  Depot,
  DepotListQuery,
  DepotRepository,
  DepotSapOperations,
  SapSyncStatus,
  UpdateDepotInput,
} from './types';

export type {
  NonBpDepot,
  NonBpDepotListQuery,
  NonBpDepotRepository,
  NonBpDepotStatus,
} from './non-bp-types';

export {
  UNMAPPED_DEPOT_FIELDS,
  depotStatusFromWire,
  depotStatusToWire,
  depotTypeFromWire,
} from './mappers';

/**
 * The entire swap surface between demo data and the platform's customer API.
 *
 * Kept behind a flag rather than switched outright: the API is the authority on who a
 * depot *is*, but carries none of the commercial analytics the CRM screens render, so
 * turning it on trades plausible demo figures for honest blanks. That is the right
 * trade for production and the wrong one for a sales demo, which is exactly what a
 * flag is for. The mock adapter stays — it is still the offline and test path.
 */
export const depotsRepository: DepotRepository = environment.depotsApiEnabled
  // Read lazily from the stored session rather than captured at module load: this
  // binding is created once, and the signed-in user is not known yet at that point.
  ? new ApiDepotRepository(() => sessionStore.read()?.user.id ?? null)
  : new MockDepotRepository();

/**
 * Prospects, behind the same flag as depots: both are demo data or both are the real
 * master, never one of each. A screen showing live depots beside invented prospects
 * would be the most misleading state of the three.
 */
export const nonBpDepotsRepository: NonBpDepotRepository = environment.depotsApiEnabled
  ? new ApiNonBpDepotRepository()
  : new MockNonBpDepotRepository();

export {
  ApiDepotRepository,
  ApiNonBpDepotRepository,
  MockDepotRepository,
  MockNonBpDepotRepository,
};
