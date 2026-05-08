import { withApiHandler } from '@/middleware';
import { peerService } from '@/services/peerService';
import { updatePeerSchema } from '@/schemas/peers';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const peerId = extractUuidParam(req, 3, 'peer ID');
    const peer = await peerService.getById(peerId);

    return { data: peer };
  },
  { roles: ['admin', 'analyst'], audit: false }
);

export const PUT = withApiHandler(
  async (req) => {
    const peerId = extractUuidParam(req, 3, 'peer ID');

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

    const parsed = updatePeerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const oldPeer = await peerService.getById(peerId);
    const updated = await peerService.update(peerId, parsed.data);

    return {
      data: updated,
      _audit: {
        entityType: 'peer_organisation',
        entityId: peerId,
        oldValue: oldPeer,
        newValue: updated,
      },
    };
  },
  { roles: ['admin', 'analyst'] }
);
