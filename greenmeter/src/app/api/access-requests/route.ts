import { withApiHandler } from '@/middleware';
import { accessRequestService } from '@/services/accessRequestService';
import { accessRequestListFilterSchema } from '@/schemas/accessRequests';

/**
 * GET /api/access-requests
 *
 * Admin-only. Lists access requests with optional status/search filters.
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

    const result = await accessRequestService.list(filters);

    return {
      data: result.data,
      meta: { total: result.total, page: filters.page, pageSize: filters.pageSize },
    };
  },
  { roles: ['admin'], audit: false }
);
