import { withApiHandler } from '@/middleware';
import { accessRequestService } from '@/services/accessRequestService';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const PUT = withApiHandler(
  async (req, ctx) => {
    const requestId = extractUuidParam(req, 3, 'request ID');

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid JSON in request body', 400);
    }

    const action = body.action;
    if (action !== 'approve' && action !== 'reject') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'action must be "approve" or "reject"', 400);
    }

    if (action === 'approve') {
      if (!body.tenantId || typeof body.tenantId !== 'string') {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'tenantId is required when approving', 400);
      }
      if (!body.role || typeof body.role !== 'string') {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'role is required when approving', 400);
      }
    }

    const updated = await accessRequestService.review(
      requestId,
      {
        action: action as 'approve' | 'reject',
        tenantId: body.tenantId as string | undefined,
        role: body.role as string | undefined,
        reviewNote: body.reviewNote as string | undefined,
      },
      ctx.userId
    );

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
