import { withApiHandler } from '@/middleware';
import { parameterService } from '@/services/parameterService';
import { parameterOverrideSchema } from '@/schemas/parameters';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req, ctx) => {
    const paramId = extractUuidParam(req, 3, 'parameter ID');
    const param = await parameterService.getById(paramId, ctx.tenantId);

    return { data: param };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

export const PUT = withApiHandler(
  async (req, ctx) => {
    const paramId = extractUuidParam(req, 3, 'parameter ID');

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

    const parsed = parameterOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid parameter override data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { data, oldValue } = await parameterService.overrideParameter(
      ctx.tenantId,
      paramId,
      parsed.data
    );

    return {
      data,
      _audit: {
        entityType: 'param_override',
        entityId: data.overrideParamId ?? data.paramId,
        oldValue,
        newValue: data,
      },
    };
  },
  { roles: ['admin'] }
);
