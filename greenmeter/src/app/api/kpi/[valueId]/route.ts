import { withApiHandler } from '@/middleware';
import { kpiService } from '@/services/kpiService';
import { kpiValueUpdateSchema } from '@/schemas/kpi';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/kpi/[valueId] — Get a single KPI value by ID.
 */
export const GET = withApiHandler(
  async (req, ctx) => {
    const valueId = extractUuidParam(req, 3, 'KPI value ID');
    const value = await kpiService.getById(valueId, ctx.tenantId);

    return { data: value };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);

/**
 * PUT /api/kpi/[valueId] — Update a KPI value.
 * Body: { value?, valueText?, unit?, sourceType?, sourceRef?, notApplicable? }
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    const valueId = extractUuidParam(req, 3, 'KPI value ID');

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

    const parsed = kpiValueUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid KPI value update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { oldValue, newValue } = await kpiService.updateValue(
      valueId,
      ctx.tenantId,
      parsed.data
    );

    return {
      data: newValue,
      _audit: {
        entityType: 'kpi_value',
        entityId: valueId,
        oldValue,
        newValue,
      },
    };
  },
  { roles: ['admin', 'analyst', 'department'] }
);

/**
 * DELETE /api/kpi/[valueId] — Delete a KPI value.
 */
export const DELETE = withApiHandler(
  async (req, ctx) => {
    const valueId = extractUuidParam(req, 3, 'KPI value ID');
    const deleted = await kpiService.deleteValue(valueId, ctx.tenantId);

    return {
      data: null,
      _audit: {
        entityType: 'kpi_value',
        entityId: valueId,
        oldValue: deleted,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
