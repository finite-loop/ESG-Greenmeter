import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import {
  inferPillarBRSR,
  inferDataType,
  inferDirection,
  inferIndicatorType,
  inferCategoryBRSR,
  generateCode,
  cellStr,
  isSectionHeader,
} from './seed-inference';

const SEED_DIR = path.resolve(__dirname, '../../seed_data');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

// ── Deterministic UUIDs ─────────────────────────────────────────
// Continuing from seed-brsr-sasb-tcfd.ts (A0F–A1A). New UK tenants: A1B–A1D.

const T = {
  bt:     '10000000-0000-0000-0000-000000000A1B',
  tesco:  '10000000-0000-0000-0000-000000000A1C',
  lloyds: '10000000-0000-0000-0000-000000000A1D',
} as const;

// Existing tenant IDs (for overlap handling)
const EXISTING = {
  bp: '10000000-0000-0000-0000-000000000A1A',
} as const;

// Existing node IDs
const EXISTING_NODES = {
  bp: '30000000-0000-0000-0000-000000000C18',
} as const;

type NewTenantKey = keyof typeof T;

const U: Record<NewTenantKey, string> = {
  bt:     '20000000-0000-0000-0000-000000000B19',
  tesco:  '20000000-0000-0000-0000-000000000B1A',
  lloyds: '20000000-0000-0000-0000-000000000B1B',
};

const N: Record<NewTenantKey, string> = {
  bt:     '30000000-0000-0000-0000-000000000C19',
  tesco:  '30000000-0000-0000-0000-000000000C1A',
  lloyds: '30000000-0000-0000-0000-000000000C1B',
};

// ── Tenant definitions ──────────────────────────────────────────

interface TenantDef {
  key: NewTenantKey;
  name: string;
  domain: string;
  sector: string;
  country: string;
  currency: string;
  fiscalYearStart: number;
  standard: string;       // Standard for parameter cloning (data is BRSR-template)
  frameworks: string[];   // Actual reporting frameworks
  sheetName: string;
  file: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  nicCode: string | null;
  gicsCode: string;
}

// All four UK companies' ESG data is mapped to BRSR template format in the Excel.
// They don't file BRSR (India-only) but the parameter structure is equivalent.
// BRSR is included in active_frameworks so BRSR-coded parameters are visible in the UI.
const NEW_TENANTS: TenantDef[] = [
  // BT Group: SASB (Telecommunication Services), TCFD. FY ends 31 Mar.
  { key: 'bt',     name: 'BT Group plc',            domain: 'bt-demo.com',     sector: 'Telecommunications',           country: 'UK', currency: 'GBP', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR', 'SASB', 'TCFD'], sheetName: 'BT Group plc',         file: 'UK_Companies_ESG_Disclosures.xlsx', adminEmail: 'admin@bt-demo.com',     adminName: 'James Fletcher',   adminPassword: 'BT@2026',     nicCode: null, gicsCode: '50101020' },
  // Tesco: SASB (Food Retailers & Distributors), TCFD, SBTi. FY ends late Feb.
  { key: 'tesco',  name: 'Tesco PLC',               domain: 'tesco-demo.com',  sector: 'Food & Drug Retailing',        country: 'UK', currency: 'GBP', fiscalYearStart: 3, standard: 'BRSR', frameworks: ['BRSR', 'SASB', 'TCFD'], sheetName: 'Tesco PLC',            file: 'UK_Companies_ESG_Disclosures.xlsx', adminEmail: 'admin@tesco-demo.com',  adminName: 'Sarah Mitchell',   adminPassword: 'Tesco@2026',  nicCode: null, gicsCode: '30101010' },
  // Lloyds: TCFD (UK mandatory), SASB (Commercial Banks), CDP, PCAF. Calendar FY.
  { key: 'lloyds', name: 'Lloyds Banking Group plc', domain: 'lloyds-demo.com', sector: 'Banking / Financial Services', country: 'UK', currency: 'GBP', fiscalYearStart: 1, standard: 'BRSR', frameworks: ['BRSR', 'TCFD', 'SASB'], sheetName: 'Lloyds Banking Group', file: 'UK_Companies_ESG_Disclosures.xlsx', adminEmail: 'admin@lloyds-demo.com', adminName: 'Oliver Pemberton', adminPassword: 'Lloyds@2026', nicCode: null, gicsCode: '40101010' },
];

// ── Overlapping companies ───────────────────────────────────────

interface OverlapDef {
  existingTenantId: string;
  existingNodeId: string;
  sheetName: string;
  file: string;
  standard: string;
  key: string;
  name: string;
  fiscalYearStart: number;
  addFrameworks?: string[];
}

const OVERLAPS: OverlapDef[] = [
  // BP already exists as TCFD tenant (A1A). Add BRSR-template ESG data + GRI/SASB frameworks.
  // BP reports under: GRI, SASB (Oil & Gas E&P), IPIECA/API/IOGP, TCFD, CDP, UK SECR.
  {
    existingTenantId: EXISTING.bp,
    existingNodeId: EXISTING_NODES.bp,
    sheetName: 'BP plc',
    file: 'UK_Companies_ESG_Disclosures.xlsx',
    standard: 'BRSR',
    key: 'bp',
    name: 'BP p.l.c.',
    fiscalYearStart: 1,
    addFrameworks: ['BRSR', 'GRI', 'SASB'],
  },
];

// ── Reporting period helpers ────────────────────────────────────

interface PeriodDef {
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear: string;
}

function makeBTGroupPeriods(tenantIdx: number): PeriodDef[] {
  // BT fiscal year: Apr–Mar. FY22 = Apr 2021 – Mar 2022, etc.
  const fyDefs = [
    { label: 'FY 2021-22', fy: '2021-22', start: '2021-04-01', end: '2022-03-31', suffix: 'F01' },
    { label: 'FY 2022-23', fy: '2022-23', start: '2022-04-01', end: '2023-03-31', suffix: 'F02' },
    { label: 'FY 2023-24', fy: '2023-24', start: '2023-04-01', end: '2024-03-31', suffix: 'F03' },
    { label: 'FY 2024-25', fy: '2024-25', start: '2024-04-01', end: '2025-03-31', suffix: 'F04' },
  ];
  return fyDefs.map(d => ({
    periodId: `40000000-0000-0000-0000-${String(tenantIdx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
    name: d.label,
    startDate: `${d.start}T00:00:00Z`,
    endDate: `${d.end}T23:59:59Z`,
    fiscalYear: d.fy,
  }));
}

function makeTescoPeriods(tenantIdx: number): PeriodDef[] {
  // Tesco fiscal year: ~Mar–Feb (year-end late February).
  const fyDefs = [
    { label: 'FY 2021/22', fy: '2021-22', start: '2021-03-01', end: '2022-02-28', suffix: 'F01' },
    { label: 'FY 2022/23', fy: '2022-23', start: '2022-03-01', end: '2023-02-28', suffix: 'F02' },
    { label: 'FY 2023/24', fy: '2023-24', start: '2023-03-01', end: '2024-02-29', suffix: 'F03' },
    { label: 'FY 2024/25', fy: '2024-25', start: '2024-03-01', end: '2025-02-28', suffix: 'F04' },
  ];
  return fyDefs.map(d => ({
    periodId: `40000000-0000-0000-0000-${String(tenantIdx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
    name: d.label,
    startDate: `${d.start}T00:00:00Z`,
    endDate: `${d.end}T23:59:59Z`,
    fiscalYear: d.fy,
  }));
}

function makeLloydsPeriods(tenantIdx: number): PeriodDef[] {
  // Lloyds: Calendar year (Jan–Dec). Labels reflect original source notation.
  const fyDefs = [
    { label: 'FY 2021', fy: '2021', start: '2021-01-01', end: '2021-12-31', suffix: 'F01' },
    { label: 'FY 2022', fy: '2022', start: '2022-01-01', end: '2022-12-31', suffix: 'F02' },
    { label: 'FY 2023', fy: '2023', start: '2023-01-01', end: '2023-12-31', suffix: 'F03' },
    { label: 'FY 2024', fy: '2024', start: '2024-01-01', end: '2024-12-31', suffix: 'F04' },
  ];
  return fyDefs.map(d => ({
    periodId: `40000000-0000-0000-0000-${String(tenantIdx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
    name: d.label,
    startDate: `${d.start}T00:00:00Z`,
    endDate: `${d.end}T23:59:59Z`,
    fiscalYear: d.fy,
  }));
}

// ── Excel parsing ───────────────────────────────────────────────

interface ParsedRow {
  code: string;
  paramName: string;
  unit: string;
  pillar: string;
  section: string;
  disclosure: string;
  computationMethod: string;
  values: { fyIndex: number; numericValue?: number; textValue?: string }[];
}

function parseNumericOrText(raw: string): { numericValue?: number; textValue?: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '\u2014' || trimmed === 'n/d') return null;

  const upper = trimmed.toUpperCase();
  // Handle N/A with optional qualifiers like "N/A (non O&G)", "N/A (retail)", "N/A (FS)"
  if (upper === 'NA' || upper.startsWith('N/A')) return null;
  if (upper === 'Y' || upper === 'YES') return { textValue: 'Y' };
  if (upper === 'N' || upper === 'NO') return { textValue: 'N' };

  const cleaned = trimmed.replace(/,/g, '').replace(/\s/g, '');
  const num = Number(cleaned);
  if (!isNaN(num) && isFinite(num)) return { numericValue: num };

  return { textValue: trimmed };
}

function parseBRSRTemplateSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return; // skip header rows

    const section = cellStr(row.getCell(1).value);
    const disclosure = cellStr(row.getCell(2).value);
    const parameter = cellStr(row.getCell(3).value);
    const unit = cellStr(row.getCell(4).value);
    const computationMethod = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(section)) return;

    const pillar = inferPillarBRSR(section);
    const code = generateCode('BRSR', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // BRSR template: 4 FY value columns starting at col 6
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 4; fyIdx++) {
      const cellVal = cellStr(row.getCell(6 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section, disclosure, computationMethod, values });
  });

  return rows;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('=== GreenMeter UK Companies ESG Data Seed ===\n');

  // ── Validate prerequisites ──
  const globalParamCheck = await sql`
    SELECT COUNT(*)::int AS cnt FROM kpi_parameters WHERE tenant_id IS NULL
  `;
  if (globalParamCheck[0].cnt === 0) {
    console.error('ERROR: No global kpi_parameters found. Run seed-parameters.ts first.');
    process.exit(1);
  }
  console.log(`[pre] Found ${globalParamCheck[0].cnt} global KPI parameters\n`);

  // ── Phase 1: Parse all Excel sheets ──
  console.log('[1/9] Parsing Excel sheets...');

  const companyData: Map<string, ParsedRow[]> = new Map();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(SEED_DIR, 'UK_Companies_ESG_Disclosures.xlsx'));

  // Parse new tenant sheets
  for (const t of NEW_TENANTS) {
    const ws = wb.getWorksheet(t.sheetName);
    if (!ws) {
      console.error(`  WARNING: Sheet "${t.sheetName}" not found, skipping ${t.name}`);
      continue;
    }

    const rows = parseBRSRTemplateSheet(ws);
    companyData.set(t.key, rows);
    const totalValues = rows.reduce((sum, r) => sum + r.values.length, 0);
    console.log(`  ${t.name}: ${rows.length} params, ${totalValues} data points`);
  }

  // Parse overlap sheets
  for (const o of OVERLAPS) {
    const ws = wb.getWorksheet(o.sheetName);
    if (!ws) {
      console.error(`  WARNING: Sheet "${o.sheetName}" not found, skipping ${o.name}`);
      continue;
    }

    const rows = parseBRSRTemplateSheet(ws);
    companyData.set(`overlap:${o.key}`, rows);
    const totalValues = rows.reduce((sum, r) => sum + r.values.length, 0);
    console.log(`  ${o.name} (overlap): ${rows.length} params, ${totalValues} data points`);
  }

  // ── Phase 1b: Upsert UK-specific global parameters ──
  // The UK Excel uses a modified BRSR template with different parameter names than the
  // original Indian BRSR Excel. We need to create global (tenant_id = NULL) parameters
  // for the UK-specific parameter codes before cloning them to tenants.
  console.log('\n[1b/9] Upserting UK-specific global BRSR parameters...');
  let globalParamsCreated = 0;

  // Collect unique parameter definitions across all UK sheets
  const globalParamDefs: Map<string, ParsedRow> = new Map();
  for (const [, rows] of companyData) {
    for (const row of rows) {
      if (!globalParamDefs.has(row.code)) {
        globalParamDefs.set(row.code, row);
      }
    }
  }

  for (const [code, row] of globalParamDefs) {
    const dataType = inferDataType(row.unit);
    const direction = inferDirection(row.paramName, row.unit);
    const indicatorType = inferIndicatorType(row.section, 'BRSR');
    const category = inferCategoryBRSR(row.section, row.disclosure);
    const newParamId = randomUUID();

    await sql`
      INSERT INTO kpi_parameters (
        param_id, tenant_id, standard, code, name, description,
        pillar, unit, data_type, category, indicator_type,
        computation_method, direction, status, disclosure, standard_section
      )
      VALUES (
        ${newParamId}::uuid,
        NULL,
        'BRSR',
        ${code},
        ${row.paramName},
        ${row.paramName},
        ${row.pillar},
        ${row.unit},
        ${dataType},
        ${category},
        ${indicatorType},
        ${row.computationMethod || null},
        ${direction},
        'active',
        ${row.disclosure || null},
        ${row.section || null}
      )
      ON CONFLICT ON CONSTRAINT uq_kpi_parameters_tenant_standard_code DO NOTHING
    `;
    globalParamsCreated++;
  }
  console.log(`  Created/skipped ${globalParamsCreated} global BRSR parameters (${globalParamDefs.size} unique codes)`);

  // ── Phase 2: Upsert new tenants ──
  console.log('\n[2/9] Upserting tenants...');
  let tenantsCreated = 0;

  for (const t of NEW_TENANTS) {
    await sql`
      INSERT INTO tenants (tenant_id, name, domain, sector, country, currency, fiscal_year_start, active_frameworks, onboarding_complete, active, nic_code, gics_code)
      VALUES (
        ${T[t.key]}::uuid,
        ${t.name},
        ${t.domain},
        ${t.sector},
        ${t.country},
        ${t.currency},
        ${t.fiscalYearStart},
        ${t.frameworks}::text[],
        true,
        true,
        ${t.nicCode},
        ${t.gicsCode}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        sector = EXCLUDED.sector,
        country = EXCLUDED.country,
        currency = EXCLUDED.currency,
        fiscal_year_start = EXCLUDED.fiscal_year_start,
        active_frameworks = EXCLUDED.active_frameworks,
        nic_code = EXCLUDED.nic_code,
        gics_code = EXCLUDED.gics_code
    `;
    tenantsCreated++;
    console.log(`  [tenant] ${t.name} (${t.country}, ${t.currency}, GICS ${t.gicsCode})`);
  }

  // Update BP frameworks to include BRSR, GRI, SASB alongside existing TCFD
  for (const o of OVERLAPS) {
    if (o.addFrameworks) {
      for (const fw of o.addFrameworks) {
        await sql`
          UPDATE tenants
          SET active_frameworks = array_append(active_frameworks, ${fw})
          WHERE tenant_id = ${o.existingTenantId}::uuid
            AND NOT (active_frameworks @> ARRAY[${fw}]::text[])
        `;
      }
      console.log(`  [tenant] ${o.name} (overlap): added frameworks ${o.addFrameworks.join(', ')}`);
    }
  }

  // ── Phase 3: Upsert admin users ──
  console.log('\n[3/9] Upserting admin users...');
  let usersCreated = 0;

  for (const t of NEW_TENANTS) {
    const hash = hashSync(t.adminPassword, 10);
    await sql`
      INSERT INTO users (user_id, tenant_id, name, email, password_hash, role, status)
      VALUES (
        ${U[t.key]}::uuid,
        ${T[t.key]}::uuid,
        ${t.adminName},
        ${t.adminEmail},
        ${hash},
        'admin',
        'active'
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}
    `;
    usersCreated++;
    console.log(`  [user] ${t.adminEmail} / ${t.adminPassword}`);
  }

  // ── Phase 4: Upsert root org nodes ──
  console.log('\n[4/9] Upserting org nodes...');
  let nodesCreated = 0;

  for (const t of NEW_TENANTS) {
    await sql`
      INSERT INTO org_nodes (node_id, tenant_id, name, node_type, code, level, active)
      VALUES (
        ${N[t.key]}::uuid,
        ${T[t.key]}::uuid,
        ${t.name},
        'company',
        ${t.key.toUpperCase() + '-HQ'},
        0,
        true
      )
      ON CONFLICT (node_id) DO NOTHING
    `;
    nodesCreated++;
    console.log(`  [org] ${t.name}`);
  }

  // ── Phase 5: Create reporting periods ──
  console.log('\n[5/9] Creating reporting periods...');
  let periodsCreated = 0;

  // Map: `key:fyIndex` -> periodId
  const periodMap: Map<string, string> = new Map();

  // New tenants — each gets 4 periods matching their fiscal year pattern
  const tenantPeriodGenerators: Record<NewTenantKey, (idx: number) => PeriodDef[]> = {
    bt: makeBTGroupPeriods,
    tesco: makeTescoPeriods,
    lloyds: makeLloydsPeriods,
  };

  const tenantKeys = Object.keys(T) as NewTenantKey[];
  for (let i = 0; i < tenantKeys.length; i++) {
    const key = tenantKeys[i];
    const t = NEW_TENANTS.find(tn => tn.key === key)!;
    const tenantIdx = 40 + i; // offset to not conflict with previous seeds
    const periods = tenantPeriodGenerators[key](tenantIdx);

    for (let j = 0; j < periods.length; j++) {
      const p = periods[j];
      await sql`
        INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
        VALUES (
          ${p.periodId}::uuid,
          ${T[key]}::uuid,
          ${p.name},
          ${p.startDate},
          ${p.endDate},
          ${p.fiscalYear},
          'closed',
          true,
          true
        )
        ON CONFLICT (period_id) DO NOTHING
      `;
      periodMap.set(`${key}:${j}`, p.periodId);
      periodsCreated++;
    }
    const names = periods.map(p => p.name).join(', ');
    console.log(`  [periods] ${t.name}: ${names}`);
  }

  // Overlap tenants — BP uses calendar year; reuse existing periods or create new
  for (const o of OVERLAPS) {
    const fyDefs = [
      { label: 'FY 2021', fy: '2021', start: '2021-01-01', end: '2021-12-31' },
      { label: 'FY 2022', fy: '2022', start: '2022-01-01', end: '2022-12-31' },
      { label: 'FY 2023', fy: '2023', start: '2023-01-01', end: '2023-12-31' },
      { label: 'FY 2024', fy: '2024', start: '2024-01-01', end: '2024-12-31' },
    ];
    for (let j = 0; j < fyDefs.length; j++) {
      const d = fyDefs[j];
      // Try to insert; if period already exists for this tenant+FY, skip
      const newPeriodId = randomUUID();
      await sql`
        INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
        VALUES (
          ${newPeriodId}::uuid,
          ${o.existingTenantId}::uuid,
          ${d.label},
          ${d.start + 'T00:00:00Z'},
          ${d.end + 'T23:59:59Z'},
          ${d.fy},
          'closed',
          true,
          true
        )
        ON CONFLICT (period_id) DO NOTHING
      `;
      // Query back to get the actual period ID (might be pre-existing)
      const found = await sql`
        SELECT period_id FROM reporting_periods
        WHERE tenant_id = ${o.existingTenantId}::uuid AND fiscal_year = ${d.fy}
        LIMIT 1
      `;
      if (found.length > 0) {
        periodMap.set(`overlap:${o.key}:${j}`, found[0].period_id);
      }
      periodsCreated++;
    }
    console.log(`  [periods] ${o.name} (overlap): ${fyDefs.map(d => d.label).join(', ')}`);
  }

  // ── Phase 6: Clone global kpi_parameters per tenant ──
  console.log('\n[6/9] Cloning KPI parameters per tenant...');
  let totalCloned = 0;

  const paramLookup: Map<string, string> = new Map();
  const canonicalLookup: Map<string, string> = new Map();

  // Clone for new tenants
  for (const t of NEW_TENANTS) {
    const globalParams = await sql`
      SELECT param_id, canonical_id, standard, standard_section, standard_code, disclosure,
             code, name, description, pillar, unit, data_type, category,
             indicator_type, computation_method, how_to_measure, how_to_compute,
             how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
      FROM kpi_parameters
      WHERE tenant_id IS NULL AND standard = ${t.standard}
    `;

    let cloned = 0;
    for (const gp of globalParams) {
      const newParamId = randomUUID();
      await sql`
        INSERT INTO kpi_parameters (
          param_id, tenant_id, canonical_id, standard, standard_section, standard_code,
          disclosure, code, name, description, pillar, unit, data_type, category,
          indicator_type, computation_method, how_to_measure, how_to_compute,
          how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
        )
        VALUES (
          ${newParamId}::uuid,
          ${T[t.key]}::uuid,
          ${gp.canonical_id}::uuid,
          ${gp.standard},
          ${gp.standard_section},
          ${gp.standard_code},
          ${gp.disclosure},
          ${gp.code},
          ${gp.name},
          ${gp.description},
          ${gp.pillar},
          ${gp.unit},
          ${gp.data_type},
          ${gp.category},
          ${gp.indicator_type},
          ${gp.computation_method},
          ${gp.how_to_measure},
          ${gp.how_to_compute},
          ${gp.how_to_report},
          ${gp.direction},
          ${gp.rollup_method},
          ${gp.status},
          ${gp.src},
          ${gp.depts},
          ${gp.standards},
          ${gp.priority_order}
        )
        ON CONFLICT ON CONSTRAINT uq_kpi_parameters_tenant_standard_code DO NOTHING
      `;
      cloned++;
    }

    const tenantParams = await sql`
      SELECT param_id, canonical_id, code
      FROM kpi_parameters
      WHERE tenant_id = ${T[t.key]}::uuid AND standard = ${t.standard}
    `;

    for (const tp of tenantParams) {
      paramLookup.set(`${t.key}:${tp.code}`, tp.param_id);
      if (tp.canonical_id) canonicalLookup.set(`${t.key}:${tp.code}`, tp.canonical_id);
    }

    totalCloned += cloned;
    console.log(`  [params] ${t.name}: ${cloned} cloned, ${tenantParams.length} active`);
  }

  // Clone BRSR params for BP (overlap — BP had TCFD params, now also gets BRSR params)
  for (const o of OVERLAPS) {
    const globalParams = await sql`
      SELECT param_id, canonical_id, standard, standard_section, standard_code, disclosure,
             code, name, description, pillar, unit, data_type, category,
             indicator_type, computation_method, how_to_measure, how_to_compute,
             how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
      FROM kpi_parameters
      WHERE tenant_id IS NULL AND standard = ${o.standard}
    `;

    let cloned = 0;
    for (const gp of globalParams) {
      const newParamId = randomUUID();
      await sql`
        INSERT INTO kpi_parameters (
          param_id, tenant_id, canonical_id, standard, standard_section, standard_code,
          disclosure, code, name, description, pillar, unit, data_type, category,
          indicator_type, computation_method, how_to_measure, how_to_compute,
          how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
        )
        VALUES (
          ${newParamId}::uuid,
          ${o.existingTenantId}::uuid,
          ${gp.canonical_id}::uuid,
          ${gp.standard},
          ${gp.standard_section},
          ${gp.standard_code},
          ${gp.disclosure},
          ${gp.code},
          ${gp.name},
          ${gp.description},
          ${gp.pillar},
          ${gp.unit},
          ${gp.data_type},
          ${gp.category},
          ${gp.indicator_type},
          ${gp.computation_method},
          ${gp.how_to_measure},
          ${gp.how_to_compute},
          ${gp.how_to_report},
          ${gp.direction},
          ${gp.rollup_method},
          ${gp.status},
          ${gp.src},
          ${gp.depts},
          ${gp.standards},
          ${gp.priority_order}
        )
        ON CONFLICT ON CONSTRAINT uq_kpi_parameters_tenant_standard_code DO NOTHING
      `;
      cloned++;
    }
    totalCloned += cloned;
    console.log(`  [params] ${o.name} (BRSR clone): ${cloned} cloned`);

    // Build lookup for overlap tenants
    const tenantParams = await sql`
      SELECT param_id, canonical_id, code
      FROM kpi_parameters
      WHERE tenant_id = ${o.existingTenantId}::uuid AND standard = ${o.standard}
    `;
    for (const tp of tenantParams) {
      paramLookup.set(`overlap:${o.key}:${tp.code}`, tp.param_id);
      if (tp.canonical_id) canonicalLookup.set(`overlap:${o.key}:${tp.code}`, tp.canonical_id);
    }
    console.log(`  [params] ${o.name} (overlap lookup): ${tenantParams.length} params for ${o.standard}`);
  }

  // ── Phase 7: Insert kpi_values from Excel data ──
  console.log('\n[7/9] Inserting KPI values from Excel data...');
  let totalInserted = 0;
  let totalSkipped = 0;
  const unmatchedParams = new Set<string>();

  // New tenants
  for (const t of NEW_TENANTS) {
    const rows = companyData.get(t.key);
    if (!rows) continue;

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const lookupKey = `${t.key}:${row.code}`;
      const paramId = paramLookup.get(lookupKey);

      if (!paramId) {
        unmatchedParams.add(`${t.standard}:${row.code} (${row.paramName})`);
        skipped += row.values.length;
        continue;
      }

      const canonicalId = canonicalLookup.get(lookupKey) || null;

      for (const v of row.values) {
        const periodKey = `${t.key}:${v.fyIndex}`;
        const periodId = periodMap.get(periodKey);
        if (!periodId) continue;

        await sql`
          INSERT INTO kpi_values (value_id, tenant_id, param_id, canonical_id, node_id, period_id, value, value_text, source_type, verified)
          VALUES (
            ${randomUUID()}::uuid,
            ${T[t.key]}::uuid,
            ${paramId}::uuid,
            ${canonicalId ? sql`${canonicalId}::uuid` : sql`NULL`},
            ${N[t.key]}::uuid,
            ${periodId}::uuid,
            ${v.numericValue != null ? String(v.numericValue) : null},
            ${v.textValue || null},
            'excel_seed',
            true
          )
          ON CONFLICT ON CONSTRAINT uq_kpi_values_tenant_param_node_period DO NOTHING
        `;
        inserted++;
      }
    }

    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(`  [values] ${t.name}: ${inserted} inserted, ${skipped} skipped`);
  }

  // Overlap tenants
  for (const o of OVERLAPS) {
    const rows = companyData.get(`overlap:${o.key}`);
    if (!rows) continue;

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const lookupKey = `overlap:${o.key}:${row.code}`;
      const paramId = paramLookup.get(lookupKey);

      if (!paramId) {
        unmatchedParams.add(`${o.standard}:${row.code} (${row.paramName})`);
        skipped += row.values.length;
        continue;
      }

      const canonicalId = canonicalLookup.get(lookupKey) || null;

      for (const v of row.values) {
        const periodKey = `overlap:${o.key}:${v.fyIndex}`;
        const periodId = periodMap.get(periodKey);
        if (!periodId) continue;

        await sql`
          INSERT INTO kpi_values (value_id, tenant_id, param_id, canonical_id, node_id, period_id, value, value_text, source_type, verified)
          VALUES (
            ${randomUUID()}::uuid,
            ${o.existingTenantId}::uuid,
            ${paramId}::uuid,
            ${canonicalId ? sql`${canonicalId}::uuid` : sql`NULL`},
            ${o.existingNodeId}::uuid,
            ${periodId}::uuid,
            ${v.numericValue != null ? String(v.numericValue) : null},
            ${v.textValue || null},
            'excel_seed',
            true
          )
          ON CONFLICT ON CONSTRAINT uq_kpi_values_tenant_param_node_period DO NOTHING
        `;
        inserted++;
      }
    }

    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(`  [values] ${o.name} (overlap): ${inserted} inserted, ${skipped} skipped`);
  }

  // ── Phase 8/9: Summary ──
  console.log('\n=== Summary ===');
  console.log(`  Global params:      ${globalParamsCreated} (${globalParamDefs.size} unique)`);
  console.log(`  New tenants:        ${tenantsCreated}`);
  console.log(`  Admin users:        ${usersCreated}`);
  console.log(`  Org nodes:          ${nodesCreated}`);
  console.log(`  Reporting periods:  ${periodsCreated}`);
  console.log(`  Params cloned:      ${totalCloned}`);
  console.log(`  Values inserted:    ${totalInserted}`);
  console.log(`  Values skipped:     ${totalSkipped}`);
  console.log(`  Unmatched params:   ${unmatchedParams.size}`);

  if (unmatchedParams.size > 0) {
    console.log('\n  Unmatched parameter codes (first 20):');
    let count = 0;
    for (const p of unmatchedParams) {
      if (count++ >= 20) { console.log('  ...'); break; }
      console.log(`    - ${p}`);
    }
  }

  // Verify total tenant count
  const tenantCount = await sql`SELECT COUNT(*)::int AS cnt FROM tenants`;
  console.log(`\n  Total tenants in DB: ${tenantCount[0].cnt}`);

  console.log('\n=== Available logins (new UK companies) ===');
  for (const t of NEW_TENANTS) {
    console.log(`  ${t.adminEmail.padEnd(34)} / ${t.adminPassword.padEnd(16)} \u2192 ${t.name}`);
  }

  console.log('\n=== UK Companies ESG data seed complete! ===');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
