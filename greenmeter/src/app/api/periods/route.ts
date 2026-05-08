import { withApiHandler } from '@/middleware';
import { db } from '@/db';
import { reportingPeriods } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/periods — List reporting periods for the current tenant.
 * Returns periods sorted by start date (most recent first).
 */
export const GET = withApiHandler(
  async (_req, ctx) => {
    const rows = await db
      .select({
        periodId: reportingPeriods.periodId,
        name: reportingPeriods.name,
        fiscalYear: reportingPeriods.fiscalYear,
        startDate: reportingPeriods.startDate,
        endDate: reportingPeriods.endDate,
        status: reportingPeriods.status,
      })
      .from(reportingPeriods)
      .where(eq(reportingPeriods.tenantId, ctx.tenantId))
      .orderBy(desc(reportingPeriods.startDate));

    const data = rows.map((r) => ({
      periodId: r.periodId,
      label: r.name,
      fiscalYear: r.fiscalYear,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
    }));

    return { data };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
