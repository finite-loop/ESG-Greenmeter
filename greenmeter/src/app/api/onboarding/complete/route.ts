import { withApiHandler } from '@/middleware';
import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH = withApiHandler(
  async (_req, ctx) => {
    await db
      .update(tenants)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(tenants.tenantId, ctx.tenantId));

    return {
      data: { onboardingComplete: true },
      _audit: {
        entityType: 'tenant',
        entityId: ctx.tenantId,
        action: 'UPDATE',
        newValue: { onboardingComplete: true },
      },
    };
  },
  { roles: ['admin'], audit: true }
);
