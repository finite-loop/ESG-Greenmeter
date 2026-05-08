import { withApiHandler } from '@/middleware';
import { integrationService } from '@/services/integrationService';
import { integrationTestSchema } from '@/schemas/integration';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * POST /api/config/integrations/test — Test an integration connection.
 * Validates endpoint reachability and auth without saving any data.
 */
export const POST = withApiHandler(
  async (req, _ctx) => {
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

    const parsed = integrationTestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid test connection input',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await integrationService.testConnection(parsed.data);
    return { data: result };
  },
  { roles: ['admin'], audit: false }
);
