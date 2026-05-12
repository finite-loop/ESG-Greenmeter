import { withApiHandler } from '@/middleware';
import { peerService } from '@/services/peerService';
import { peerSyncSchema } from '@/schemas/peers';
import { AppError, ErrorCode } from '@/lib/errors';

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

    const parsed = peerSyncSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid sync request',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const results = await peerService.syncSuggestions(ctx.tenantId, parsed.data);

    return {
      data: results,
      _audit: {
        entityType: 'peer_suggestion_sync',
        entityId: ctx.tenantId,
        newValue: { synced: results.filter((r) => r.status === 'created').length, total: results.length },
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
