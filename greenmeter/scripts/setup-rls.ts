import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });

/**
 * Tables with tenant_id NOT NULL — standard tenant isolation policy.
 * Queries must set app.current_tenant_id via set_config to see rows.
 */
const tenantScopedTables = [
  'org_nodes',
  'reporting_periods',
  'users',
  'kpi_values',
  'raw_extractions',
  'extracted_metrics',
  'peer_kpi_values',
  'unmapped_metrics',
  'peer_organisations',
  'goals',
  'goal_components',
  'milestones',
  'generated_reports',
  'suppliers',
  'supplier_assessments',
  'tenant_config',
  'documents',
] as const;

/**
 * Tables where tenant_id can be NULL for platform-seed/default rows.
 * Policy uses: tenant_id = current_tenant OR tenant_id IS NULL
 */
const platformSeedTables = [
  'kpi_parameters',
  'report_templates',
  'scoring_weights',
  'thresholds',
] as const;

/**
 * The tenants table itself uses tenant_id as PK.
 * Policy: only see own tenant row.
 */
const tenantSelfTable = 'tenants';

/**
 * Audit logs: INSERT only — no SELECT/UPDATE/DELETE by application role.
 * (Admin/superuser can still query for debugging; application gets INSERT only.)
 */
const auditTable = 'audit_logs';

async function setupRls() {
  console.log('Setting up Row-Level Security policies...\n');

  // --- Standard tenant-scoped tables ---
  for (const table of tenantScopedTables) {
    console.log(`  [RLS] ${table} — standard tenant isolation`);
    await client.unsafe(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS tenant_isolation_select ON ${table};
      CREATE POLICY tenant_isolation_select ON ${table} FOR SELECT
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      DROP POLICY IF EXISTS tenant_isolation_insert ON ${table};
      CREATE POLICY tenant_isolation_insert ON ${table} FOR INSERT
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      DROP POLICY IF EXISTS tenant_isolation_update ON ${table};
      CREATE POLICY tenant_isolation_update ON ${table} FOR UPDATE
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      DROP POLICY IF EXISTS tenant_isolation_delete ON ${table};
      CREATE POLICY tenant_isolation_delete ON ${table} FOR DELETE
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    `);
  }

  // --- Platform-seed tables (tenant_id nullable) ---
  for (const table of platformSeedTables) {
    console.log(`  [RLS] ${table} — tenant OR platform-seed (NULL)`);
    await client.unsafe(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS tenant_or_platform_select ON ${table};
      CREATE POLICY tenant_or_platform_select ON ${table} FOR SELECT
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);

      DROP POLICY IF EXISTS tenant_or_platform_insert ON ${table};
      CREATE POLICY tenant_or_platform_insert ON ${table} FOR INSERT
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);

      DROP POLICY IF EXISTS tenant_or_platform_update ON ${table};
      CREATE POLICY tenant_or_platform_update ON ${table} FOR UPDATE
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);

      DROP POLICY IF EXISTS tenant_or_platform_delete ON ${table};
      CREATE POLICY tenant_or_platform_delete ON ${table} FOR DELETE
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);
    `);
  }

  // --- Tenants table (PK is tenant_id) ---
  console.log(`  [RLS] ${tenantSelfTable} — self-isolation (PK = tenant_id)`);
  await client.unsafe(`
    ALTER TABLE ${tenantSelfTable} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${tenantSelfTable} FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_self_select ON ${tenantSelfTable};
    CREATE POLICY tenant_self_select ON ${tenantSelfTable} FOR SELECT
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

    DROP POLICY IF EXISTS tenant_self_insert ON ${tenantSelfTable};
    CREATE POLICY tenant_self_insert ON ${tenantSelfTable} FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

    DROP POLICY IF EXISTS tenant_self_update ON ${tenantSelfTable};
    CREATE POLICY tenant_self_update ON ${tenantSelfTable} FOR UPDATE
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

    DROP POLICY IF EXISTS tenant_self_delete ON ${tenantSelfTable};
    CREATE POLICY tenant_self_delete ON ${tenantSelfTable} FOR DELETE
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);

  // --- Audit logs: INSERT only ---
  console.log(`  [RLS] ${auditTable} — INSERT only (no SELECT/UPDATE/DELETE)`);
  await client.unsafe(`
    ALTER TABLE ${auditTable} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ${auditTable} FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS audit_insert_only ON ${auditTable};
    CREATE POLICY audit_insert_only ON ${auditTable} FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  `);
  // No SELECT/UPDATE/DELETE policies = those operations denied by default with RLS enabled.

  console.log('\n  RLS setup complete. All policies applied successfully.');
}

setupRls()
  .catch((err) => {
    console.error('RLS setup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
