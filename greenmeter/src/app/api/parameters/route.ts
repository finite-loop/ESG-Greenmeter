import { withApiHandler } from '@/middleware';
import { parameterService } from '@/services/parameterService';
import { parameterListFilterSchema } from '@/schemas/parameters';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = parameterListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await parameterService.list(ctx.tenantId, parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
