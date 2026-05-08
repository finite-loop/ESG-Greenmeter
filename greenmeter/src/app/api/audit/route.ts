import { withApiHandler } from '@/middleware';
import { auditService } from '@/services/auditService';
import { auditFilterSchema } from '@/schemas/audit';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = auditFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid audit filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await auditService.getFiltered(parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
