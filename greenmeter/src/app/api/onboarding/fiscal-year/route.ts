import { withApiHandler } from '@/middleware';
import { fiscalYearSchema } from '@/schemas/onboarding';
import { AppError, ErrorCode } from '@/lib/errors';
import { db } from '@/db';
import { tenants, reportingPeriods } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const POST = withApiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = fiscalYearSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid fiscal year data',
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { startMonth } = parsed.data;

    // Update tenant fiscal year start
    await db
      .update(tenants)
      .set({ fiscalYearStart: startMonth, updatedAt: new Date() })
      .where(eq(tenants.tenantId, ctx.tenantId));

    // Generate the current fiscal year reporting period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Determine the start year of the current fiscal year
    let fyStartYear: number;
    if (currentMonth >= startMonth) {
      fyStartYear = currentYear;
    } else {
      fyStartYear = currentYear - 1;
    }

    const fyEndYear = fyStartYear + 1;
    const startDate = new Date(fyStartYear, startMonth - 1, 1); // month is 0-indexed in Date
    const endDate = new Date(fyEndYear, startMonth - 1, 1); // start of next FY = end of current

    // Build period label
    const fiscalYear = startMonth === 1
      ? `${fyStartYear}`
      : `${fyStartYear}-${String(fyEndYear).slice(2)}`;
    const periodName = startMonth === 1
      ? `FY ${fyStartYear}`
      : `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`;

    // Delete existing periods for this tenant (fresh onboarding)
    await db.delete(reportingPeriods).where(eq(reportingPeriods.tenantId, ctx.tenantId));

    // Create the reporting period
    const [period] = await db
      .insert(reportingPeriods)
      .values({
        tenantId: ctx.tenantId,
        name: periodName,
        startDate,
        endDate,
        fiscalYear,
        status: 'open',
      })
      .returning({ periodId: reportingPeriods.periodId });

    return {
      data: {
        fiscalYearStart: startMonth,
        period: { periodId: period.periodId, name: periodName, fiscalYear },
      },
      _audit: {
        entityType: 'tenant',
        entityId: ctx.tenantId,
        action: 'UPDATE',
        newValue: { fiscalYearStart: startMonth, periodCreated: periodName },
      },
    };
  },
  { roles: ['admin'], audit: true }
);
