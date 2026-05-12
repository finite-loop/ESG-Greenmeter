import { withApiHandler } from '@/middleware';
import { db } from '@/db';
import { tenants } from '@/db/schema/tenants';
import { eq } from 'drizzle-orm';

export const GET = withApiHandler(
  async () => {
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

    return { data: rows };
  },
  { roles: ['admin', 'analyst', 'department', 'viewer'], audit: false }
);
