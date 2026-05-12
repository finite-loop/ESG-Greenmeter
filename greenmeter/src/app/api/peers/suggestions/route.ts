import { withApiHandler } from '@/middleware';
import { peerService } from '@/services/peerService';
import { peerSuggestionsFilterSchema } from '@/schemas/peers';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req, ctx) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = peerSuggestionsFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const suggestions = await peerService.getSuggestions(ctx.tenantId, parsed.data);

    return { data: suggestions };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
