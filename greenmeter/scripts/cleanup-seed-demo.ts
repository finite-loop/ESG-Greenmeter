/**
 * cleanup-seed-demo.ts
 *
 * One-shot script to remove seed-demo synthetic data that overlaps with
 * the exhaustive Excel seed data. Also removes HDFC and Dr. Reddy's
 * tenants entirely (they only had seed-demo data).
 *
 * Usage:
 *   cd greenmeter && DATABASE_URL="..." npx tsx scripts/cleanup-seed-demo.ts
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

// Tenant IDs from seed-demo.ts (deterministic UUIDs)
const OVERLAPPING_TENANTS = {
  infosys:  '10000000-0000-0000-0000-000000000A01',
  siemens:  '10000000-0000-0000-0000-000000000A02',
  givaudan: '10000000-0000-0000-0000-000000000A03',
  tata:     '10000000-0000-0000-0000-000000000A04',
} as const;

const REMOVE_TENANTS = {
  hdfc:     '10000000-0000-0000-0000-000000000A05',
  drreddy:  '10000000-0000-0000-0000-000000000A06',
} as const;

// seed-demo created these child (division) node IDs — remove from overlapping tenants
const SEED_DEMO_CHILD_NODES = [
  // Infosys divisions
  '30000000-0000-0000-0000-000000000B01',
  '30000000-0000-0000-0000-000000000B02',
  '30000000-0000-0000-0000-000000000B03',
  // Siemens divisions
  '30000000-0000-0000-0000-000000000B04',
  '30000000-0000-0000-0000-000000000B05',
  '30000000-0000-0000-0000-000000000B06',
  // Givaudan divisions
  '30000000-0000-0000-0000-000000000B07',
  '30000000-0000-0000-0000-000000000B08',
  '30000000-0000-0000-0000-000000000B09',
  // Tata divisions
  '30000000-0000-0000-0000-000000000B10',
  '30000000-0000-0000-0000-000000000B11',
  '30000000-0000-0000-0000-000000000B12',
];

// seed-demo period IDs for the 4 overlapping tenants
function periodId(tenantIdx: number, suffix: string): string {
  const last = `${tenantIdx}${suffix}`.padStart(12, '0');
  return `40000000-0000-0000-0000-${last}`;
}

const SEED_DEMO_PERIODS = [
  // Infosys (idx 1)
  periodId(1, 'C01'), periodId(1, 'C02'),
  // Siemens (idx 2)
  periodId(2, 'C01'), periodId(2, 'C02'),
  // Givaudan (idx 3)
  periodId(3, 'C01'), periodId(3, 'C02'),
  // Tata (idx 4)
  periodId(4, 'C01'), periodId(4, 'C02'),
];

// Demo user that seed-demo added to Infosys
const DEMO_USER_ID = '20000000-0000-0000-0000-000000000A07';

interface Summary {
  [key: string]: number;
}

async function main() {
  const summary: Summary = {};

  console.log('=== Cleanup seed-demo data ===\n');

  const overlapIds = Object.values(OVERLAPPING_TENANTS);
  const removeIds = Object.values(REMOVE_TENANTS);
  const allSeedDemoIds = [...overlapIds, ...removeIds];

  // ── Step 1: Delete seed-sourced kpi_values for overlapping tenants ──
  console.log('[1/8] Deleting seed-sourced kpi_values for overlapping tenants...');
  const seedValuesResult = await sql`
    DELETE FROM kpi_values
    WHERE source_type = 'seed'
      AND tenant_id = ANY(${overlapIds}::uuid[])
  `;
  summary['kpi_values (seed, overlapping)'] = seedValuesResult.count;
  console.log(`  Deleted ${seedValuesResult.count} rows`);

  // ── Step 2: Delete seed-demo-only periods for overlapping tenants ──
  console.log('\n[2/8] Deleting seed-demo periods for overlapping tenants...');
  // First remove any kpi_values referencing these periods
  const periodValuesResult = await sql`
    DELETE FROM kpi_values
    WHERE period_id = ANY(${SEED_DEMO_PERIODS}::uuid[])
  `;
  summary['kpi_values (seed-demo periods)'] = periodValuesResult.count;
  console.log(`  Deleted ${periodValuesResult.count} kpi_values referencing seed-demo periods`);

  const periodsResult = await sql`
    DELETE FROM reporting_periods
    WHERE period_id = ANY(${SEED_DEMO_PERIODS}::uuid[])
  `;
  summary['reporting_periods (seed-demo)'] = periodsResult.count;
  console.log(`  Deleted ${periodsResult.count} reporting_periods`);

  // ── Step 3: Delete orphaned kpi_parameters (seed-demo clones with no kpi_values) ──
  console.log('\n[3/8] Deleting orphaned seed-demo kpi_parameters for overlapping tenants...');

  // First remove any goals referencing orphaned params
  const orphanGoalsResult = await sql`
    DELETE FROM goals
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND param_id IN (
        SELECT p.param_id FROM kpi_parameters p
        WHERE p.tenant_id = ANY(${overlapIds}::uuid[])
          AND p.canonical_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM kpi_values v WHERE v.param_id = p.param_id
          )
      )
  `;
  summary['goals (orphaned params)'] = orphanGoalsResult.count;
  console.log(`  Deleted ${orphanGoalsResult.count} goals referencing orphaned params`);

  // Remove thresholds referencing orphaned params
  const orphanThreshResult = await sql`
    DELETE FROM thresholds
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND param_id IN (
        SELECT p.param_id FROM kpi_parameters p
        WHERE p.tenant_id = ANY(${overlapIds}::uuid[])
          AND p.canonical_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM kpi_values v WHERE v.param_id = p.param_id
          )
      )
  `;
  summary['thresholds (orphaned params)'] = orphanThreshResult.count;
  console.log(`  Deleted ${orphanThreshResult.count} thresholds referencing orphaned params`);

  // Remove recommendations referencing orphaned params
  const orphanRecsResult = await sql`
    DELETE FROM recommendations
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND param_id IN (
        SELECT p.param_id FROM kpi_parameters p
        WHERE p.tenant_id = ANY(${overlapIds}::uuid[])
          AND p.canonical_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM kpi_values v WHERE v.param_id = p.param_id
          )
      )
  `;
  summary['recommendations (orphaned params)'] = orphanRecsResult.count;
  console.log(`  Deleted ${orphanRecsResult.count} recommendations referencing orphaned params`);

  // Remove peer_kpi_values referencing orphaned params
  const orphanPeerValsResult = await sql`
    DELETE FROM peer_kpi_values
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND param_id IN (
        SELECT p.param_id FROM kpi_parameters p
        WHERE p.tenant_id = ANY(${overlapIds}::uuid[])
          AND p.canonical_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM kpi_values v WHERE v.param_id = p.param_id
          )
      )
  `;
  summary['peer_kpi_values (orphaned params)'] = orphanPeerValsResult.count;
  console.log(`  Deleted ${orphanPeerValsResult.count} peer_kpi_values referencing orphaned params`);

  // Now delete the orphaned kpi_parameters themselves
  const orphanParamsResult = await sql`
    DELETE FROM kpi_parameters
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND canonical_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM kpi_values v WHERE v.param_id = kpi_parameters.param_id
      )
  `;
  summary['kpi_parameters (orphaned)'] = orphanParamsResult.count;
  console.log(`  Deleted ${orphanParamsResult.count} orphaned kpi_parameters`);

  // ── Step 4: Delete seed-demo child org_nodes for overlapping tenants ──
  console.log('\n[4/8] Deleting seed-demo division nodes for overlapping tenants...');
  // Remove any kpi_values referencing these nodes first
  const nodeValuesResult = await sql`
    DELETE FROM kpi_values
    WHERE node_id = ANY(${SEED_DEMO_CHILD_NODES}::uuid[])
  `;
  summary['kpi_values (child nodes)'] = nodeValuesResult.count;
  console.log(`  Deleted ${nodeValuesResult.count} kpi_values referencing child nodes`);

  const childNodesResult = await sql`
    DELETE FROM org_nodes
    WHERE node_id = ANY(${SEED_DEMO_CHILD_NODES}::uuid[])
  `;
  summary['org_nodes (seed-demo divisions)'] = childNodesResult.count;
  console.log(`  Deleted ${childNodesResult.count} division org_nodes`);

  // ── Step 5: Clean up remaining seed-demo data for overlapping tenants ──
  console.log('\n[5/8] Cleaning up remaining seed-demo data for overlapping tenants...');

  // Delete peer_kpi_values referencing seed-demo peers
  const peerValsCleanup = await sql`
    DELETE FROM peer_kpi_values
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND peer_id IN (
        SELECT peer_id FROM peer_organisations
        WHERE tenant_id = ANY(${overlapIds}::uuid[])
          AND name IN ('HDFC Banking Group', $$Dr. Reddy's Laboratories$$)
      )
  `;
  summary['peer_kpi_values (HDFC/DrReddy peers)'] = peerValsCleanup.count;
  console.log(`  Deleted ${peerValsCleanup.count} peer_kpi_values for HDFC/DrReddy peers`);

  // Delete peer_organisations entries that reference HDFC/DrReddy as peers
  const peersCleanup = await sql`
    DELETE FROM peer_organisations
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND name IN ('HDFC Banking Group', $$Dr. Reddy's Laboratories$$)
  `;
  summary['peer_organisations (HDFC/DrReddy refs)'] = peersCleanup.count;
  console.log(`  Deleted ${peersCleanup.count} peer_organisations referencing HDFC/DrReddy`);

  // Delete seed-demo scoring weights for overlapping tenants (Excel data has its own)
  const weightsCleanup = await sql`
    DELETE FROM scoring_weights
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
  `;
  summary['scoring_weights (overlapping)'] = weightsCleanup.count;
  console.log(`  Deleted ${weightsCleanup.count} scoring_weights`);

  // Delete seed-demo thresholds for overlapping tenants (if still remaining)
  const threshCleanup = await sql`
    DELETE FROM thresholds
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND param_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM kpi_parameters p WHERE p.param_id = thresholds.param_id
      )
  `;
  summary['thresholds (dangling refs)'] = threshCleanup.count;
  console.log(`  Deleted ${threshCleanup.count} dangling thresholds`);

  // Delete seed-demo recommendations for overlapping tenants
  const recsCleanup = await sql`
    DELETE FROM recommendations
    WHERE tenant_id = ANY(${overlapIds}::uuid[])
      AND source = 'rule'
  `;
  summary['recommendations (seed-demo, overlapping)'] = recsCleanup.count;
  console.log(`  Deleted ${recsCleanup.count} seed-demo recommendations`);

  // ── Step 6: Delete HDFC and Dr. Reddy's entirely ──
  console.log('\n[6/8] Deleting HDFC and Dr. Reddy\'s tenants entirely...');

  // Order matters: child tables first, then parent tables

  // audit_logs
  const auditResult = await sql`DELETE FROM audit_logs WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['audit_logs (removed tenants)'] = auditResult.count;
  console.log(`  audit_logs: ${auditResult.count}`);

  // milestones (via goals cascade, but be explicit)
  const msResult = await sql`
    DELETE FROM milestones WHERE tenant_id = ANY(${removeIds}::uuid[])
  `;
  summary['milestones (removed tenants)'] = msResult.count;
  console.log(`  milestones: ${msResult.count}`);

  // goal_components (via goals cascade, but be explicit)
  const gcResult = await sql`
    DELETE FROM goal_components WHERE tenant_id = ANY(${removeIds}::uuid[])
  `;
  summary['goal_components (removed tenants)'] = gcResult.count;
  console.log(`  goal_components: ${gcResult.count}`);

  // goals
  const goalsResult = await sql`DELETE FROM goals WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['goals (removed tenants)'] = goalsResult.count;
  console.log(`  goals: ${goalsResult.count}`);

  // recommendations
  const recsResult = await sql`DELETE FROM recommendations WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['recommendations (removed tenants)'] = recsResult.count;
  console.log(`  recommendations: ${recsResult.count}`);

  // thresholds
  const threshResult = await sql`DELETE FROM thresholds WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['thresholds (removed tenants)'] = threshResult.count;
  console.log(`  thresholds: ${threshResult.count}`);

  // scoring_weights
  const swResult = await sql`DELETE FROM scoring_weights WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['scoring_weights (removed tenants)'] = swResult.count;
  console.log(`  scoring_weights: ${swResult.count}`);

  // peer_kpi_values
  const pkvResult = await sql`DELETE FROM peer_kpi_values WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['peer_kpi_values (removed tenants)'] = pkvResult.count;
  console.log(`  peer_kpi_values: ${pkvResult.count}`);

  // peer_organisations
  const poResult = await sql`DELETE FROM peer_organisations WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['peer_organisations (removed tenants)'] = poResult.count;
  console.log(`  peer_organisations: ${poResult.count}`);

  // kpi_values
  const kvResult = await sql`DELETE FROM kpi_values WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['kpi_values (removed tenants)'] = kvResult.count;
  console.log(`  kpi_values: ${kvResult.count}`);

  // kpi_parameters
  const kpResult = await sql`DELETE FROM kpi_parameters WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['kpi_parameters (removed tenants)'] = kpResult.count;
  console.log(`  kpi_parameters: ${kpResult.count}`);

  // Tables that may not exist yet (not yet migrated) — delete safely
  const optionalTables = [
    'extracted_metrics', 'raw_extractions', 'documents', 'unmapped_metrics',
    'supplier_assessments', 'suppliers', 'generated_reports', 'report_templates',
    'tenant_config',
  ];
  for (const tbl of optionalTables) {
    try {
      const r = await sql.unsafe(`DELETE FROM ${tbl} WHERE tenant_id = ANY($1::uuid[])`, [removeIds]);
      if (r.count > 0) {
        summary[`${tbl} (removed tenants)`] = r.count;
        console.log(`  ${tbl}: ${r.count}`);
      }
    } catch {
      // Table doesn't exist yet — skip
    }
  }

  // reporting_periods
  const rpResult = await sql`DELETE FROM reporting_periods WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['reporting_periods (removed tenants)'] = rpResult.count;
  console.log(`  reporting_periods: ${rpResult.count}`);

  // org_nodes
  // Delete children first (level > 0), then root
  const onChildResult = await sql`DELETE FROM org_nodes WHERE tenant_id = ANY(${removeIds}::uuid[]) AND level > 0`;
  const onRootResult = await sql`DELETE FROM org_nodes WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['org_nodes (removed tenants)'] = onChildResult.count + onRootResult.count;
  console.log(`  org_nodes: ${onChildResult.count + onRootResult.count}`);

  // sessions (auth.js)
  const sessResult = await sql`
    DELETE FROM sessions WHERE user_id IN (
      SELECT user_id FROM users WHERE tenant_id = ANY(${removeIds}::uuid[])
    )
  `;
  summary['sessions (removed tenants)'] = sessResult.count;

  // accounts (auth.js)
  const accResult = await sql`
    DELETE FROM accounts WHERE user_id IN (
      SELECT user_id FROM users WHERE tenant_id = ANY(${removeIds}::uuid[])
    )
  `;
  summary['accounts (removed tenants)'] = accResult.count;

  // users
  const usersResult = await sql`DELETE FROM users WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['users (removed tenants)'] = usersResult.count;
  console.log(`  users: ${usersResult.count}`);

  // tenants themselves
  const tenantsResult = await sql`DELETE FROM tenants WHERE tenant_id = ANY(${removeIds}::uuid[])`;
  summary['tenants (removed)'] = tenantsResult.count;
  console.log(`  tenants: ${tenantsResult.count}`);

  // ── Step 7: Also remove peer refs from non-overlapping tenants pointing to removed tenants ──
  console.log('\n[7/8] Cleaning up cross-references to removed tenants...');

  const crossPeerVals = await sql`
    DELETE FROM peer_kpi_values
    WHERE peer_id IN (
      SELECT peer_id FROM peer_organisations
      WHERE name IN ('HDFC Banking Group', $$Dr. Reddy's Laboratories$$)
    )
  `;
  summary['peer_kpi_values (cross-refs)'] = crossPeerVals.count;
  console.log(`  peer_kpi_values cross-refs: ${crossPeerVals.count}`);

  const crossPeers = await sql`
    DELETE FROM peer_organisations
    WHERE name IN ('HDFC Banking Group', $$Dr. Reddy's Laboratories$$)
  `;
  summary['peer_organisations (cross-refs)'] = crossPeers.count;
  console.log(`  peer_organisations cross-refs: ${crossPeers.count}`);

  // ── Step 8: Verify final state ──
  console.log('\n[8/8] Verifying final state...');

  const tenantCount = await sql`SELECT COUNT(*) as cnt FROM tenants`;
  console.log(`  Total tenants: ${tenantCount[0].cnt}`);

  const tenantList = await sql`SELECT name, tenant_id FROM tenants ORDER BY name`;
  for (const t of tenantList) {
    const paramCount = await sql`SELECT COUNT(*) as cnt FROM kpi_parameters WHERE tenant_id = ${t.tenant_id}::uuid`;
    const valueCount = await sql`SELECT COUNT(*) as cnt FROM kpi_values WHERE tenant_id = ${t.tenant_id}::uuid`;
    console.log(`  ${t.name}: ${paramCount[0].cnt} params, ${valueCount[0].cnt} values`);
  }

  // ── Summary ──
  console.log('\n=== Cleanup Summary ===');
  for (const [key, count] of Object.entries(summary)) {
    if (count > 0) {
      console.log(`  ${key}: ${count}`);
    }
  }
  console.log('\nDone!');
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
