import { withApiHandler } from '@/middleware';
import { peerService } from '@/services/peerService';
import { peerValuesFilterSchema } from '@/schemas/peers';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const peerId = extractUuidParam(req, 3, 'peer ID');
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = peerValuesFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await peerService.getValues(peerId, parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);
