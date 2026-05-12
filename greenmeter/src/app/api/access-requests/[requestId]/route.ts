import { withApiHandler } from '@/middleware';
import { accessRequestService } from '@/services/accessRequestService';
import { accessRequestReviewSchema } from '@/schemas/accessRequests';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * PUT /api/access-requests/[requestId]
 *
 * Admin-only. Approve or reject a registration request.
 */
export const PUT = withApiHandler(
  async (req, ctx) => {
    const requestId = extractUuidParam(req, 3, 'request ID');

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

    const parsed = accessRequestReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid review data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await accessRequestService.review(requestId, parsed.data, ctx.userId);

    return {
      data: updated,
      _audit: {
        entityType: 'access_request',
        entityId: requestId,
        newValue: updated,
      },
    };
  },
  { roles: ['admin'] }
);
