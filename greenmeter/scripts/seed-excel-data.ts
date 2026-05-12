import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import {
  inferPillarBRSR,
  inferPillarESRS,
  inferPillarGRI,
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
// Reuse A01–A04 from seed-demo.ts. Skip A05/A06 (HDFC/Dr.Reddy's). New companies A07–A0E.

const T = {
  infosys:    '10000000-0000-0000-0000-000000000A01',
  tata:       '10000000-0000-0000-0000-000000000A04',
  reliance:   '10000000-0000-0000-0000-000000000A07',
  tcs:        '10000000-0000-0000-0000-000000000A08',
  siemens:    '10000000-0000-0000-0000-000000000A02',
  novo:       '10000000-0000-0000-0000-000000000A09',
  mercedes:   '10000000-0000-0000-0000-000000000A0A',
  volkswagen: '10000000-0000-0000-0000-000000000A0B',
  givaudan:   '10000000-0000-0000-0000-000000000A03',
  walmart:    '10000000-0000-0000-0000-000000000A0C',
  merck:      '10000000-0000-0000-0000-000000000A0D',
  iff:        '10000000-0000-0000-0000-000000000A0E',
} as const;

type TenantKey = keyof typeof T;

const U: Record<TenantKey, string> = {
  infosys:    '20000000-0000-0000-0000-000000000B01',
  tata:       '20000000-0000-0000-0000-000000000B02',
  reliance:   '20000000-0000-0000-0000-000000000B03',
  tcs:        '20000000-0000-0000-0000-000000000B04',
  siemens:    '20000000-0000-0000-0000-000000000B05',
  novo:       '20000000-0000-0000-0000-000000000B06',
  mercedes:   '20000000-0000-0000-0000-000000000B07',
  volkswagen: '20000000-0000-0000-0000-000000000B08',
  givaudan:   '20000000-0000-0000-0000-000000000B09',
  walmart:    '20000000-0000-0000-0000-000000000B0A',
  merck:      '20000000-0000-0000-0000-000000000B0B',
  iff:        '20000000-0000-0000-0000-000000000B0C',
};

const N: Record<TenantKey, string> = {
  // Reuse seed-demo.ts node IDs for overlapping companies
  infosys:    '30000000-0000-0000-0000-000000000A01',
  tata:       '30000000-0000-0000-0000-000000000A04',
  siemens:    '30000000-0000-0000-0000-000000000A02',
  givaudan:   '30000000-0000-0000-0000-000000000A03',
  // New companies get new node IDs
  reliance:   '30000000-0000-0000-0000-000000000C03',
  tcs:        '30000000-0000-0000-0000-000000000C04',
  novo:       '30000000-0000-0000-0000-000000000C06',
  mercedes:   '30000000-0000-0000-0000-000000000C07',
  volkswagen: '30000000-0000-0000-0000-000000000C08',
  walmart:    '30000000-0000-0000-0000-000000000C0A',
  merck:      '30000000-0000-0000-0000-000000000C0B',
  iff:        '30000000-0000-0000-0000-000000000C0C',
};

// ── Tenant definitions ──────────────────────────────────────────

interface TenantDef {
  key: TenantKey;
  name: string;
  domain: string;
  sector: string;
  country: string;
  currency: string;
  fiscalYearStart: number;
  standard: string;
  frameworks: string[];
  sheetName: string;
  file: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

const TENANTS: TenantDef[] = [
  // BRSR companies (India, INR, fiscal_year_start=4)
  { key: 'infosys',  name: 'Infosys Technologies',   domain: 'infosys-demo.com',    sector: 'IT Services',              country: 'India',       currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Infosys',              file: 'BRSR_Seed_Data.xlsx', adminEmail: 'admin@infosys-demo.com',    adminName: 'Rajesh Kumar',     adminPassword: 'Infosys@2026' },
  { key: 'tata',     name: 'Tata Steel Industries',   domain: 'tatasteel-demo.com',  sector: 'Steel & Mining',           country: 'India',       currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Tata Steel',           file: 'BRSR_Seed_Data.xlsx', adminEmail: 'admin@tatasteel-demo.com',  adminName: 'Arjun Mehta',      adminPassword: 'TataSteel@2026' },
  { key: 'reliance', name: 'Reliance Industries',     domain: 'reliance-demo.com',   sector: 'Diversified Conglomerate', country: 'India',       currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Reliance Industries',   file: 'BRSR_Seed_Data.xlsx', adminEmail: 'admin@reliance-demo.com',   adminName: 'Anant Sharma',     adminPassword: 'Reliance@2026' },
  { key: 'tcs',      name: 'TCS',                     domain: 'tcs-demo.com',        sector: 'IT Services',              country: 'India',       currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'TCS',                  file: 'BRSR_Seed_Data.xlsx', adminEmail: 'admin@tcs-demo.com',        adminName: 'Suresh Iyer',      adminPassword: 'TCS@2026' },

  // ESRS companies (Europe, EUR, fiscal_year_start=1)
  { key: 'siemens',    name: 'Siemens Energy AG',     domain: 'siemens-demo.com',    sector: 'Industrial Technology',    country: 'Germany',     currency: 'EUR', fiscalYearStart: 1, standard: 'ESRS', frameworks: ['ESRS'], sheetName: 'Siemens',              file: 'ESRS_Seed_Data.xlsx', adminEmail: 'admin@siemens-demo.com',    adminName: 'Hans Mueller',     adminPassword: 'Siemens@2026' },
  { key: 'novo',       name: 'Novo Nordisk',          domain: 'novo-demo.com',       sector: 'Pharmaceuticals',          country: 'Denmark',     currency: 'DKK', fiscalYearStart: 1, standard: 'ESRS', frameworks: ['ESRS'], sheetName: 'Novo Nordisk',         file: 'ESRS_Seed_Data.xlsx', adminEmail: 'admin@novo-demo.com',       adminName: 'Lars Jensen',      adminPassword: 'NovoNordisk@2026' },
  { key: 'mercedes',   name: 'Mercedes-Benz',         domain: 'mercedes-demo.com',   sector: 'Automotive',               country: 'Germany',     currency: 'EUR', fiscalYearStart: 1, standard: 'ESRS', frameworks: ['ESRS'], sheetName: 'Mercedes-Benz',        file: 'ESRS_Seed_Data.xlsx', adminEmail: 'admin@mercedes-demo.com',   adminName: 'Klaus Weber',      adminPassword: 'Mercedes@2026' },
  { key: 'volkswagen', name: 'Volkswagen Group',       domain: 'volkswagen-demo.com', sector: 'Automotive',               country: 'Germany',     currency: 'EUR', fiscalYearStart: 1, standard: 'ESRS', frameworks: ['ESRS'], sheetName: 'Volkswagen Group',     file: 'ESRS_Seed_Data.xlsx', adminEmail: 'admin@volkswagen-demo.com', adminName: 'Dieter Schmidt',   adminPassword: 'Volkswagen@2026' },

  // GRI companies (Global, mixed currencies, fiscal_year_start=1)
  { key: 'givaudan', name: 'Givaudan SA',             domain: 'givaudan-demo.com',   sector: 'Flavours & Fragrances',    country: 'Switzerland', currency: 'CHF', fiscalYearStart: 1, standard: 'GRI',  frameworks: ['GRI'],  sheetName: 'Givaudan',             file: 'GRI_Seed_Data.xlsx',  adminEmail: 'admin@givaudan-demo.com',   adminName: 'Marie Dupont',     adminPassword: 'Givaudan@2026' },
  { key: 'walmart',  name: 'Walmart Inc.',             domain: 'walmart-demo.com',    sector: 'Retail',                   country: 'USA',         currency: 'USD', fiscalYearStart: 1, standard: 'GRI',  frameworks: ['GRI'],  sheetName: 'Walmart',              file: 'GRI_Seed_Data.xlsx',  adminEmail: 'admin@walmart-demo.com',    adminName: 'John Smith',       adminPassword: 'Walmart@2026' },
  { key: 'merck',    name: 'Merck KGaA',               domain: 'merck-demo.com',      sector: 'Pharmaceuticals',          country: 'Germany',     currency: 'EUR', fiscalYearStart: 1, standard: 'GRI',  frameworks: ['GRI'],  sheetName: 'Merck',                file: 'GRI_Seed_Data.xlsx',  adminEmail: 'admin@merck-demo.com',      adminName: 'Friedrich Braun',  adminPassword: 'Merck@2026' },
  { key: 'iff',      name: 'IFF',                      domain: 'iff-demo.com',        sector: 'Specialty Chemicals',      country: 'USA',         currency: 'USD', fiscalYearStart: 1, standard: 'GRI',  frameworks: ['GRI'],  sheetName: 'IFF',                  file: 'GRI_Seed_Data.xlsx',  adminEmail: 'admin@iff-demo.com',        adminName: 'Michael Davis',    adminPassword: 'IFF@2026' },
];

// ── Reporting period helpers ────────────────────────────────────

interface PeriodDef {
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear: string;
}

function makePeriods(tenant: TenantDef): PeriodDef[] {
  const idx = Object.keys(T).indexOf(tenant.key);
  const periods: PeriodDef[] = [];

  if (tenant.fiscalYearStart === 4) {
    // Indian fiscal year: Apr–Mar
    const fyDefs = [
      { label: 'FY 2021-22', fy: '2021-22', start: '2021-04-01', end: '2022-03-31', suffix: 'D01' },
      { label: 'FY 2022-23', fy: '2022-23', start: '2022-04-01', end: '2023-03-31', suffix: 'D02' },
      { label: 'FY 2023-24', fy: '2023-24', start: '2023-04-01', end: '2024-03-31', suffix: 'D03' },
    ];
    for (const d of fyDefs) {
      periods.push({
        periodId: `40000000-0000-0000-0000-${String(idx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
        name: d.label,
        startDate: `${d.start}T00:00:00Z`,
        endDate: `${d.end}T23:59:59Z`,
        fiscalYear: d.fy,
      });
    }
  } else {
    // Calendar year: Jan–Dec
    const fyDefs = [
      { label: 'FY 2022', fy: '2022', start: '2022-01-01', end: '2022-12-31', suffix: 'D01' },
      { label: 'FY 2023', fy: '2023', start: '2023-01-01', end: '2023-12-31', suffix: 'D02' },
      { label: 'FY 2024', fy: '2024', start: '2024-01-01', end: '2024-12-31', suffix: 'D03' },
    ];
    for (const d of fyDefs) {
      periods.push({
        periodId: `40000000-0000-0000-0000-${String(idx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
        name: d.label,
        startDate: `${d.start}T00:00:00Z`,
        endDate: `${d.end}T23:59:59Z`,
        fiscalYear: d.fy,
      });
    }
  }

  return periods;
}

// ── Excel parsing ───────────────────────────────────────────────

interface ParsedRow {
  code: string;
  paramName: string;
  unit: string;
  pillar: string;
  section: string;
  values: { fyIndex: number; numericValue?: number; textValue?: string }[];
}

function parseNumericOrText(raw: string): { numericValue?: number; textValue?: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'N/A' || trimmed === 'NA') return null;

  // Y/N text values
  const upper = trimmed.toUpperCase();
  if (upper === 'Y' || upper === 'YES') return { textValue: 'Y' };
  if (upper === 'N' || upper === 'NO') return { textValue: 'N' };

  // Try numeric
  const cleaned = trimmed.replace(/,/g, '').replace(/\s/g, '');
  const num = Number(cleaned);
  if (!isNaN(num) && isFinite(num)) return { numericValue: num };

  // Fallback: store as text
  return { textValue: trimmed };
}

function parseBRSRSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const section = cellStr(row.getCell(1).value);
    const parameter = cellStr(row.getCell(3).value);
    const unit = cellStr(row.getCell(4).value);

    if (!parameter || isSectionHeader(section)) return;

    const pillar = inferPillarBRSR(section);
    const code = generateCode('BRSR', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // BRSR: FY values in cols 6, 7, 8 (FY2022, FY2023, FY2024)
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 3; fyIdx++) {
      const cellVal = cellStr(row.getCell(6 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section, values });
  });

  return rows;
}

function parseESRSSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const esrsStd = cellStr(row.getCell(1).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(esrsStd)) return;

    const pillar = inferPillarESRS(esrsStd);
    const code = generateCode('ESRS', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // ESRS: FY values in cols 7, 8, 9
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 3; fyIdx++) {
      const cellVal = cellStr(row.getCell(7 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section: esrsStd, values });
  });

  return rows;
}

function parseGRISheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const griSeries = cellStr(row.getCell(1).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(griSeries)) return;

    const pillar = inferPillarGRI(griSeries);
    const code = generateCode('GRI', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // GRI: FY values in cols 7, 8, 9
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 3; fyIdx++) {
      const cellVal = cellStr(row.getCell(7 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section: griSeries, values });
  });

  return rows;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('=== GreenMeter Excel Data Seed ===\n');

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
  console.log('[1/8] Parsing Excel sheets...');

  const companyData: Map<TenantKey, ParsedRow[]> = new Map();
  const workbookCache: Map<string, ExcelJS.Workbook> = new Map();

  for (const t of TENANTS) {
    let wb = workbookCache.get(t.file);
    if (!wb) {
      wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(SEED_DIR, t.file));
      workbookCache.set(t.file, wb);
    }

    const ws = wb.getWorksheet(t.sheetName);
    if (!ws) {
      console.error(`  WARNING: Sheet "${t.sheetName}" not found in ${t.file}, skipping ${t.name}`);
      continue;
    }

    let rows: ParsedRow[];
    if (t.standard === 'BRSR') rows = parseBRSRSheet(ws);
    else if (t.standard === 'ESRS') rows = parseESRSSheet(ws);
    else rows = parseGRISheet(ws);

    companyData.set(t.key, rows);
    const totalValues = rows.reduce((sum, r) => sum + r.values.length, 0);
    console.log(`  ${t.name}: ${rows.length} params, ${totalValues} data points`);
  }

  // ── Phase 2: Upsert 12 tenants ──
  console.log('\n[2/8] Upserting tenants...');
  let tenantsCreated = 0;

  for (const t of TENANTS) {
    await sql`
      INSERT INTO tenants (tenant_id, name, domain, sector, country, currency, fiscal_year_start, active_frameworks, onboarding_complete, active)
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
        true
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        sector = EXCLUDED.sector,
        country = EXCLUDED.country,
        currency = EXCLUDED.currency,
        fiscal_year_start = EXCLUDED.fiscal_year_start,
        active_frameworks = EXCLUDED.active_frameworks
    `;
    tenantsCreated++;
    console.log(`  [tenant] ${t.name} (${t.country}, ${t.currency})`);
  }

  // ── Phase 3: Upsert 12 admin users ──
  console.log('\n[3/8] Upserting admin users...');
  let usersCreated = 0;

  for (const t of TENANTS) {
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

  // ── Phase 4: Upsert 12 root org nodes ──
  console.log('\n[4/8] Upserting org nodes...');
  let nodesCreated = 0;

  for (const t of TENANTS) {
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

  // ── Phase 5: Create 36 reporting periods (3 per company) ──
  console.log('\n[5/8] Creating reporting periods...');
  let periodsCreated = 0;

  const periodMap: Map<string, string> = new Map(); // key: `tenantKey:fyIndex` → periodId

  for (const t of TENANTS) {
    const periods = makePeriods(t);
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      await sql`
        INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
        VALUES (
          ${p.periodId}::uuid,
          ${T[t.key]}::uuid,
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
      periodMap.set(`${t.key}:${i}`, p.periodId);
      periodsCreated++;
    }
    const names = periods.map(p => p.name).join(', ');
    console.log(`  [periods] ${t.name}: ${names}`);
  }

  // ── Phase 6: Clone global kpi_parameters per tenant ──
  console.log('\n[6/8] Cloning KPI parameters per tenant...');
  let totalCloned = 0;

  // paramLookup: Map<`tenantKey:code`, paramId>
  const paramLookup: Map<string, string> = new Map();
  // canonicalLookup: Map<`tenantKey:code`, canonicalId>
  const canonicalLookup: Map<string, string> = new Map();

  for (const t of TENANTS) {
    // Get all global params for this standard
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

    // Query back actual param_ids to build lookup map
    const tenantParams = await sql`
      SELECT param_id, canonical_id, code
      FROM kpi_parameters
      WHERE tenant_id = ${T[t.key]}::uuid AND standard = ${t.standard}
    `;

    for (const tp of tenantParams) {
      paramLookup.set(`${t.key}:${tp.code}`, tp.param_id);
      if (tp.canonical_id) {
        canonicalLookup.set(`${t.key}:${tp.code}`, tp.canonical_id);
      }
    }

    totalCloned += cloned;
    console.log(`  [params] ${t.name}: ${cloned} cloned, ${tenantParams.length} active`);
  }

  // ── Phase 7: Insert kpi_values from Excel data ──
  console.log('\n[7/8] Inserting KPI values from Excel data...');
  let totalInserted = 0;
  let totalSkipped = 0;
  const unmatchedParams = new Set<string>();

  for (const t of TENANTS) {
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

  // ── Phase 8: Summary ──
  console.log('\n=== Summary ===');
  console.log(`  Tenants:            ${tenantsCreated}`);
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

  console.log('\n=== Available logins ===');
  for (const t of TENANTS) {
    console.log(`  ${t.adminEmail.padEnd(34)} / ${t.adminPassword.padEnd(20)} → ${t.name}`);
  }

  console.log('\n=== Excel data seed complete! ===');
}

main()
  .catch((err) => {
    console.error('Excel data seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
