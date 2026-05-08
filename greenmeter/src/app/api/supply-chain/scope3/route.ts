import { withApiHandler } from '@/middleware';
import { supplierService } from '@/services/supplierService';

/**
 * GET /api/supply-chain/scope3
 *
 * Returns Scope 3 Category 1 aggregation: total tCO2e and per-supplier breakdown.
 */
export const GET = withApiHandler(
  async () => {
    const result = await supplierService.getScope3Summary();
    return { data: result };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
