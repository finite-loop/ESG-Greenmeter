import { withApiHandler } from '@/middleware';
import { peerService } from '@/services/peerService';
import { peerListFilterSchema, createPeerSchema } from '@/schemas/peers';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = peerListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await peerService.list(parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

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

    const parsed = createPeerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid peer data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const peer = await peerService.create(ctx.tenantId, parsed.data);

    return {
      data: peer,
      _audit: {
        entityType: 'peer_organisation',
        entityId: peer.peerId,
        newValue: peer,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
