import { withApiHandler } from '@/middleware';
import { companyProfileSchema } from '@/schemas/onboarding';
import { AppError, ErrorCode } from '@/lib/errors';
import { db } from '@/db';
import { tenants, tenantConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = withApiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = companyProfileSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid company profile data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { companyName, sector, country, currency } = parsed.data;

    // Update tenant record
    await db
      .update(tenants)
      .set({
        name: companyName,
        sector,
        country,
        currency,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, ctx.tenantId));

    // Save wizard progress to tenant_config
    await db
      .insert(tenantConfig)
      .values({
        tenantId: ctx.tenantId,
        key: 'onboarding_step',
        value: JSON.stringify({ completedStep: 1, profile: parsed.data }),
      })
      .onConflictDoUpdate({
        target: [tenantConfig.tenantId, tenantConfig.key],
        set: {
          value: JSON.stringify({ completedStep: 1, profile: parsed.data }),
          updatedAt: new Date(),
        },
      });

    return {
      data: { success: true },
      _audit: {
        entityType: 'tenant',
        entityId: ctx.tenantId,
        action: 'UPDATE',
        newValue: { companyName, sector, country, currency },
      },
    };
  },
  { roles: ['admin'], audit: true }
);
