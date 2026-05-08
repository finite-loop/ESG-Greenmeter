import { withApiHandler } from '@/middleware';
import { kpiService } from '@/services/kpiService';
import { kpiValueListFilterSchema, kpiValueCreateSchema } from '@/schemas/kpi';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/kpi — List KPI values with filters and RAG status.
 * Query params: periodId, standard, pillar, category, department, nodeId, page, pageSize
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = kpiValueListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await kpiService.listValues(ctx.tenantId, parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);

/**
 * POST /api/kpi — Create a new KPI value.
 * Body: { paramId, nodeId, periodId, value?, valueText?, unit?, sourceType, sourceRef?, notApplicable? }
 */
export const POST = withApiHandler(
  async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body',
        400
      );
    }

    const parsed = kpiValueCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid KPI value data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const created = await kpiService.createValue(ctx.tenantId, parsed.data);

    return {
      data: created,
      _audit: {
        entityType: 'kpi_value',
        entityId: created.valueId,
        newValue: created,
      },
    };
  },
  { roles: ['admin', 'analyst', 'department'] }
);
