import { withApiHandler } from '@/middleware';
import { userService } from '@/services/userService';
import { userUpdateSchema } from '@/schemas/users';
import { extractUuidParam } from '@/lib/params';
import { AppError, ErrorCode } from '@/lib/errors';

export const GET = withApiHandler(
  async (req) => {
    const userId = extractUuidParam(req, 3, 'user ID');
    const user = await userService.getById(userId);

    return { data: user };
  },
  { roles: ['admin'], audit: false }
);

export const PUT = withApiHandler(
  async (req, ctx) => {
    const userId = extractUuidParam(req, 3, 'user ID');

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

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid update data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const oldUser = await userService.getById(userId);
    const updated = await userService.update(userId, parsed.data, ctx.userId);

    return {
      data: updated,
      _audit: {
        entityType: 'user',
        entityId: userId,
        oldValue: oldUser,
        newValue: updated,
      },
    };
  },
  { roles: ['admin'] }
);
