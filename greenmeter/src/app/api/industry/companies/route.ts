import { withApiHandler } from '@/middleware';
import { db } from '@/db';
import { tenants } from '@/db/schema/tenants';
import { eq } from 'drizzle-orm';

export const GET = withApiHandler(
  async (_req, ctx) => {
    const rows = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        sector: tenants.sector,
        country: tenants.country,
        gicsCode: tenants.gicsCode,
        activeFrameworks: tenants.activeFrameworks,
      })
      .from(tenants)
      .where(eq(tenants.active, true));

    const data = rows.map(r => ({
      ...r,
      isCurrent: r.tenantId === ctx.tenantId,
    }));

    return { data };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
