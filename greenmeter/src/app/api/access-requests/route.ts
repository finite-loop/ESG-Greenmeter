import { withApiHandler } from '@/middleware';
import { accessRequestService } from '@/services/accessRequestService';
import { accessRequestListFilterSchema } from '@/schemas/accessRequests';
import { db } from '@/db';
import { tenants } from '@/db/schema/tenants';
import { eq } from 'drizzle-orm';

/**
 * GET /api/access-requests
 *
 * Admin-only. Lists access requests with optional status/search filters.
 * Also returns the tenant list for the approval dropdown.
 */
export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const filters = accessRequestListFilterSchema.parse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });

    const [result, tenantRows] = await Promise.all([
      accessRequestService.list(filters),
      db
        .select({ tenantId: tenants.tenantId, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.active, true)),
    ]);

    return {
      data: result.data,
      tenants: tenantRows,
      meta: { total: result.total, page: filters.page, pageSize: filters.pageSize },
    };
  },
  { roles: ['admin'], audit: false }
);
