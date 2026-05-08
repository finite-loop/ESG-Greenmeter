import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';
const ROOT_NODE_ID = '00000000-0000-0000-0000-000000000003';
const PERIOD_ID = '00000000-0000-0000-0000-000000000004';

async function main() {
  console.log('Seeding dev tenant, user, and supporting data...\n');

  // 1. Create dev tenant
  console.log('  [seed] tenant — GreenMeter Dev Co');
  await client`
    INSERT INTO tenants (tenant_id, name, domain, sector, country, currency, fiscal_year_start, active_frameworks, onboarding_complete, active)
    VALUES (
      ${TENANT_ID}::uuid,
      'GreenMeter Dev Co',
      'greenmeter.local',
      'Technology',
      'India',
      'INR',
      4,
      ARRAY['GRI', 'BRSR'],
      true,
      true
    )
    ON CONFLICT (tenant_id) DO NOTHING
  `;

  // 2. Create root org node (company level)
  console.log('  [seed] org_node — GreenMeter Dev Co (company root)');
  await client`
    INSERT INTO org_nodes (node_id, tenant_id, name, node_type, code, level, active)
    VALUES (
      ${ROOT_NODE_ID}::uuid,
      ${TENANT_ID}::uuid,
      'GreenMeter Dev Co',
      'company',
      'GM-HQ',
      0,
      true
    )
    ON CONFLICT (node_id) DO NOTHING
  `;

  // 3. Create a reporting period (current fiscal year)
  console.log('  [seed] reporting_period — FY 2025-26');
  await client`
    INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
    VALUES (
      ${PERIOD_ID}::uuid,
      ${TENANT_ID}::uuid,
      'FY 2025-26',
      '2025-04-01T00:00:00Z',
      '2026-03-31T23:59:59Z',
      '2025-26',
      'open',
      false,
      true
    )
    ON CONFLICT (period_id) DO NOTHING
  `;

  // 4. Create admin user
  console.log('  [seed] user — admin@greenmeter.local (admin)');
  await client`
    INSERT INTO users (user_id, tenant_id, name, email, role, status)
    VALUES (
      ${USER_ID}::uuid,
      ${TENANT_ID}::uuid,
      'Dev Admin',
      'admin@greenmeter.local',
      'admin',
      'active'
    )
    ON CONFLICT (email) DO NOTHING
  `;

  console.log('\n  Dev seed complete.');
  console.log('  Login with: admin@greenmeter.local');
}

main()
  .catch((err) => {
    console.error('Dev seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
