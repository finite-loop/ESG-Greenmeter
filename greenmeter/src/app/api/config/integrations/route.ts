import { withApiHandler } from '@/middleware';
import { integrationService } from '@/services/integrationService';
import { integrationConfigSchema } from '@/schemas/integration';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * GET /api/config/integrations — List all integration configs with masked credentials.
 */
export const GET = withApiHandler(
  async (_req, ctx) => {
    const configs = await integrationService.listConfigs(ctx.tenantId);
    return { data: configs };
  },
  { roles: ['admin'], audit: false }
);

/**
 * POST /api/config/integrations — Create or update an integration config.
 * Credentials are encrypted before storage. Audit logged automatically.
 */
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

    const parsed = integrationConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid integration configuration',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await integrationService.saveConfig(
      ctx.tenantId,
      parsed.data
    );

    return {
      data: result.response,
      _audit: {
        entityType: 'integration_config',
        entityId: result.newValue.configId,
        oldValue: result.oldValue
          ? { key: result.oldValue.key, configId: result.oldValue.configId }
          : null,
        newValue: {
          key: result.newValue.key,
          configId: result.newValue.configId,
          integrationType: parsed.data.integrationType,
          endpoint: parsed.data.endpoint,
          scheduleCron: parsed.data.scheduleCron,
          enabled: parsed.data.enabled,
          // Credential intentionally omitted from audit
        },
      },
    };
  },
  { roles: ['admin'] }
);
