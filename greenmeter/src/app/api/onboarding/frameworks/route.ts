import { withApiHandler } from '@/middleware';
import { frameworkSelectionSchema } from '@/schemas/onboarding';
import { AppError, ErrorCode } from '@/lib/errors';
import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = withApiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = frameworkSelectionSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid framework selection',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { frameworks } = parsed.data;

    // Update tenant with selected frameworks and mark onboarding as complete
    await db
      .update(tenants)
      .set({
        activeFrameworks: frameworks,
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, ctx.tenantId));

    return {
      data: { success: true, frameworks },
      _audit: {
        entityType: 'tenant',
        entityId: ctx.tenantId,
        action: 'UPDATE',
        newValue: { activeFrameworks: frameworks, onboardingComplete: true },
      },
    };
  },
  { roles: ['admin'], audit: true }
);
