import { withApiHandler } from '@/middleware';
import { userService } from '@/services/userService';
import { userListFilterSchema, userInviteSchema } from '@/schemas/users';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const url = new URL(req.url);
    const rawParams: Record<string, string> = {};

    for (const [key, value] of url.searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = userListFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid filter parameters',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await userService.list(parsed.data);

    return {
      data: result.data,
      meta: result.meta,
    };
  },
  { roles: ['admin'], audit: false }
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

    const parsed = userInviteSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const user = await userService.invite(ctx.tenantId, parsed.data);

    return {
      data: user,
      _audit: {
        entityType: 'user',
        entityId: user.userId,
        newValue: user,
      },
    };
  },
  { roles: ['admin'] }
);
