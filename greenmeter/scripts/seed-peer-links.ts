import postgres from 'postgres';

/**
 * Seed peer organisation links based on shared GICS codes.
 *
 * For every pair of active tenants that share the same gics_code,
 * creates bidirectional peer_organisations records so each tenant
 * sees the other as a peer for same-industry benchmarking.
 *
 * Clears all existing peer_kpi_values and peer_organisations first
 * (the old demo records were stale cross-sector links).
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

interface TenantRow {
  tenant_id: string;
  name: string;
  sector: string | null;
  country: string | null;
  gics_code: string;
}

async function main() {
  console.log('=== Seed Peer Links by GICS Code ===\n');

  // 1. Delete existing peer data (clean slate)
  const deletedKpi = await sql`DELETE FROM peer_kpi_values`;
  console.log(`Deleted ${deletedKpi.count} peer_kpi_values rows`);

  const deletedPeers = await sql`DELETE FROM peer_organisations`;
  console.log(`Deleted ${deletedPeers.count} peer_organisations rows\n`);

  // 2. Fetch all active tenants with a non-null gics_code
  const tenants = await sql<TenantRow[]>`
    SELECT tenant_id, name, sector, country, gics_code
    FROM tenants
    WHERE active = true AND gics_code IS NOT NULL
    ORDER BY gics_code, name
  `;
  console.log(`Found ${tenants.length} active tenants with GICS codes\n`);

  // 3. Group by gics_code
  const groups = new Map<string, TenantRow[]>();
  for (const t of tenants) {
    const list = groups.get(t.gics_code) ?? [];
    list.push(t);
    groups.set(t.gics_code, list);
  }

  // 4. Insert bidirectional peer links for groups with 2+ tenants
  let totalInserted = 0;

  for (const [gicsCode, members] of groups) {
    if (members.length < 2) continue;

    const names = members.map((m) => m.name).join(', ');
    console.log(`GICS ${gicsCode} (${members.length} companies): ${names}`);

    for (const owner of members) {
      for (const peer of members) {
        if (owner.tenant_id === peer.tenant_id) continue;

        await sql`
          INSERT INTO peer_organisations
            (tenant_id, name, sector, country, market_cap, source_tenant_id, active)
          VALUES
            (${owner.tenant_id}::uuid, ${peer.name}, ${peer.sector}, ${peer.country}, 'large_cap', ${peer.tenant_id}::uuid, true)
        `;
        totalInserted++;
      }
    }
  }

  console.log(`\nInserted ${totalInserted} peer_organisations records`);

  // 5. Summary: count peers per tenant
  const summary = await sql`
    SELECT t.name, COUNT(*) as peer_count
    FROM peer_organisations po
    JOIN tenants t ON t.tenant_id = po.tenant_id
    GROUP BY t.name
    ORDER BY t.name
  `;

  console.log('\n=== Peers per Tenant ===');
  for (const row of summary) {
    console.log(`  ${row.name}: ${row.peer_count} peers`);
  }

  console.log('\nDone.');
  await sql.end();
}

main().catch((err) => {
  console.error('Error seeding peer links:', err);
  process.exit(1);
});
