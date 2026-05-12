import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import {
  inferPillarBRSR,
  inferPillarSASB,
  inferPillarTCFD,
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
// Continuing from seed-excel-data.ts (A01–A0E). New tenants: A0F–A1A.

const T = {
  // New BRSR companies
  adani:        '10000000-0000-0000-0000-000000000A0F',
  birla:        '10000000-0000-0000-0000-000000000A10',
  cochin:       '10000000-0000-0000-0000-000000000A11',
  dabur:        '10000000-0000-0000-0000-000000000A12',
  hul:          '10000000-0000-0000-0000-000000000A13',
  techmahindra: '10000000-0000-0000-0000-000000000A14',
  wipro:        '10000000-0000-0000-0000-000000000A15',
  // New SASB companies
  microsoft:    '10000000-0000-0000-0000-000000000A16',
  merckus:      '10000000-0000-0000-0000-000000000A17',
  // New TCFD companies
  jpmorgan:     '10000000-0000-0000-0000-000000000A18',
  unilever:     '10000000-0000-0000-0000-000000000A19',
  bp:           '10000000-0000-0000-0000-000000000A1A',
} as const;

// Existing tenant IDs (for overlap handling)
const EXISTING = {
  reliance: '10000000-0000-0000-0000-000000000A07',
  tcs:      '10000000-0000-0000-0000-000000000A08',
  walmart:  '10000000-0000-0000-0000-000000000A0C',
} as const;

// Existing node IDs
const EXISTING_NODES = {
  reliance: '30000000-0000-0000-0000-000000000C03',
  tcs:      '30000000-0000-0000-0000-000000000C04',
  walmart:  '30000000-0000-0000-0000-000000000C0A',
} as const;

type NewTenantKey = keyof typeof T;

const U: Record<NewTenantKey, string> = {
  adani:        '20000000-0000-0000-0000-000000000B0D',
  birla:        '20000000-0000-0000-0000-000000000B0E',
  cochin:       '20000000-0000-0000-0000-000000000B0F',
  dabur:        '20000000-0000-0000-0000-000000000B10',
  hul:          '20000000-0000-0000-0000-000000000B11',
  techmahindra: '20000000-0000-0000-0000-000000000B12',
  wipro:        '20000000-0000-0000-0000-000000000B13',
  microsoft:    '20000000-0000-0000-0000-000000000B14',
  merckus:      '20000000-0000-0000-0000-000000000B15',
  jpmorgan:     '20000000-0000-0000-0000-000000000B16',
  unilever:     '20000000-0000-0000-0000-000000000B17',
  bp:           '20000000-0000-0000-0000-000000000B18',
};

const N: Record<NewTenantKey, string> = {
  adani:        '30000000-0000-0000-0000-000000000C0D',
  birla:        '30000000-0000-0000-0000-000000000C0E',
  cochin:       '30000000-0000-0000-0000-000000000C0F',
  dabur:        '30000000-0000-0000-0000-000000000C10',
  hul:          '30000000-0000-0000-0000-000000000C11',
  techmahindra: '30000000-0000-0000-0000-000000000C12',
  wipro:        '30000000-0000-0000-0000-000000000C13',
  microsoft:    '30000000-0000-0000-0000-000000000C14',
  merckus:      '30000000-0000-0000-0000-000000000C15',
  jpmorgan:     '30000000-0000-0000-0000-000000000C16',
  unilever:     '30000000-0000-0000-0000-000000000C17',
  bp:           '30000000-0000-0000-0000-000000000C18',
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
  standard: string;
  frameworks: string[];
  sheetName: string;
  file: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  nicCode: string | null;
  gicsCode: string;
}

const NEW_TENANTS: TenantDef[] = [
  // New BRSR companies (India, INR, fiscal_year_start=4)
  { key: 'adani',        name: 'Adani Total Gas',          domain: 'adani-demo.com',        sector: 'Energy',                 country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Adani Total Gas',  file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@adani-demo.com',        adminName: 'Vikram Patel',      adminPassword: 'Adani@2026',        nicCode: '35203', gicsCode: '10102020' },
  { key: 'birla',        name: 'UltraTech Cement',         domain: 'ultratech-demo.com',    sector: 'Materials',              country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Birla',           file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@ultratech-demo.com',    adminName: 'Sanjay Birla',      adminPassword: 'UltraTech@2026',    nicCode: '23941', gicsCode: '15101010' },
  { key: 'cochin',       name: 'Cochin Shipyard',          domain: 'cochinshipyard-demo.com', sector: 'Industrials',           country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Cochin Shipyard', file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@cochinshipyard-demo.com', adminName: 'Ajay Nair',        adminPassword: 'Cochin@2026',       nicCode: '30111', gicsCode: '20101010' },
  { key: 'dabur',        name: 'Dabur India Limited',      domain: 'dabur-demo.com',        sector: 'Consumer Goods',         country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Dabur',           file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@dabur-demo.com',        adminName: 'Priya Verma',       adminPassword: 'Dabur@2026',        nicCode: '21001', gicsCode: '30202010' },
  { key: 'hul',          name: 'Hindustan Unilever',       domain: 'hul-demo.com',          sector: 'Consumer Goods',         country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'HUL',             file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@hul-demo.com',          adminName: 'Deepak Gupta',      adminPassword: 'HUL@2026',          nicCode: '20231', gicsCode: '30202010' },
  { key: 'techmahindra', name: 'Tech Mahindra',            domain: 'techmahindra-demo.com', sector: 'IT Services',            country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Tech Mahindra',   file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@techmahindra-demo.com', adminName: 'Rohit Chandra',     adminPassword: 'TechM@2026',        nicCode: '62011', gicsCode: '45102010' },
  { key: 'wipro',        name: 'Wipro',                    domain: 'wipro-demo.com',        sector: 'IT Services',            country: 'India', currency: 'INR', fiscalYearStart: 4, standard: 'BRSR', frameworks: ['BRSR'], sheetName: 'Wipro',           file: 'BRSR_ESG_Data_Updated.xlsx', adminEmail: 'admin@wipro-demo.com',        adminName: 'Kavitha Reddy',     adminPassword: 'Wipro@2026',        nicCode: '62011', gicsCode: '45102010' },

  // New SASB companies (USA, USD, fiscal_year_start=1)
  { key: 'microsoft',    name: 'Microsoft Corporation',    domain: 'microsoft-demo.com',    sector: 'IT & Technology',        country: 'USA',   currency: 'USD', fiscalYearStart: 1, standard: 'SASB', frameworks: ['SASB'], sheetName: 'SASB \u2013 Microsoft',  file: 'SASB_TCFD_Real_Data.xlsx', adminEmail: 'admin@microsoft-demo.com',    adminName: 'Sarah Johnson',     adminPassword: 'Microsoft@2026',    nicCode: null, gicsCode: '45103010' },
  { key: 'merckus',      name: 'Merck & Co., Inc.',        domain: 'merckus-demo.com',      sector: 'Healthcare',             country: 'USA',   currency: 'USD', fiscalYearStart: 1, standard: 'SASB', frameworks: ['SASB'], sheetName: 'SASB \u2013 Merck',      file: 'SASB_TCFD_Real_Data.xlsx', adminEmail: 'admin@merckus-demo.com',      adminName: 'James Wilson',      adminPassword: 'MerckUS@2026',      nicCode: null, gicsCode: '35201010' },

  // New TCFD companies
  { key: 'jpmorgan',     name: 'JPMorgan Chase',           domain: 'jpmorgan-demo.com',     sector: 'Financial Services',     country: 'USA',   currency: 'USD', fiscalYearStart: 1, standard: 'TCFD', frameworks: ['TCFD'], sheetName: 'TCFD \u2013 JPMorgan Chase', file: 'SASB_TCFD_Real_Data.xlsx', adminEmail: 'admin@jpmorgan-demo.com', adminName: 'Robert Chen',       adminPassword: 'JPMorgan@2026',     nicCode: null, gicsCode: '40101010' },
  { key: 'unilever',     name: 'Unilever PLC',             domain: 'unilever-demo.com',     sector: 'Consumer Goods',         country: 'UK',    currency: 'GBP', fiscalYearStart: 1, standard: 'TCFD', frameworks: ['TCFD'], sheetName: 'TCFD \u2013 Unilever',       file: 'SASB_TCFD_Real_Data.xlsx', adminEmail: 'admin@unilever-demo.com',     adminName: 'Emma Clarke',       adminPassword: 'Unilever@2026',     nicCode: null, gicsCode: '30202010' },
  { key: 'bp',           name: 'BP p.l.c.',                domain: 'bp-demo.com',           sector: 'Energy',                 country: 'UK',    currency: 'GBP', fiscalYearStart: 1, standard: 'TCFD', frameworks: ['TCFD'], sheetName: 'TCFD \u2013 BP',             file: 'SASB_TCFD_Real_Data.xlsx', adminEmail: 'admin@bp-demo.com',           adminName: 'David Brown',       adminPassword: 'BP@2026',           nicCode: null, gicsCode: '10102010' },
];

// ── Overlapping companies ───────────────────────────────────────

interface OverlapDef {
  existingTenantId: string;
  existingNodeId: string;
  sheetName: string;
  file: string;
  standard: string;
  parser: 'brsr' | 'sasb';
  key: string;
  name: string;
  fiscalYearStart: number;
  /** Additional framework to add (for Walmart getting SASB alongside GRI) */
  addFramework?: string;
}

const OVERLAPS: OverlapDef[] = [
  { existingTenantId: EXISTING.reliance, existingNodeId: EXISTING_NODES.reliance, sheetName: 'Reliance Industries', file: 'BRSR_ESG_Data_Updated.xlsx', standard: 'BRSR', parser: 'brsr', key: 'reliance', name: 'Reliance Industries',   fiscalYearStart: 4 },
  { existingTenantId: EXISTING.tcs,      existingNodeId: EXISTING_NODES.tcs,      sheetName: 'TCS',                  file: 'BRSR_ESG_Data_Updated.xlsx', standard: 'BRSR', parser: 'brsr', key: 'tcs',      name: 'TCS',                    fiscalYearStart: 4 },
  { existingTenantId: EXISTING.walmart,   existingNodeId: EXISTING_NODES.walmart,  sheetName: 'SASB \u2013 Walmart',  file: 'SASB_TCFD_Real_Data.xlsx',   standard: 'SASB', parser: 'sasb', key: 'walmart',  name: 'Walmart Inc.',           fiscalYearStart: 1, addFramework: 'SASB' },
];

// ── Reporting period helpers ────────────────────────────────────

interface PeriodDef {
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  fiscalYear: string;
}

function makeNewBRSRPeriods(tenantIdx: number): PeriodDef[] {
  // Indian fiscal year: Apr–Mar. 4 periods: FY2022-23, FY2023-24, FY2024-25, plus FY2021-22
  const fyDefs = [
    { label: 'FY 2021-22', fy: '2021-22', start: '2021-04-01', end: '2022-03-31', suffix: 'E01' },
    { label: 'FY 2022-23', fy: '2022-23', start: '2022-04-01', end: '2023-03-31', suffix: 'E02' },
    { label: 'FY 2023-24', fy: '2023-24', start: '2023-04-01', end: '2024-03-31', suffix: 'E03' },
    { label: 'FY 2024-25', fy: '2024-25', start: '2024-04-01', end: '2025-03-31', suffix: 'E04' },
  ];
  return fyDefs.map(d => ({
    periodId: `40000000-0000-0000-0000-${String(tenantIdx).padStart(4, '0')}${d.suffix}`.padEnd(36, '0'),
    name: d.label,
    startDate: `${d.start}T00:00:00Z`,
    endDate: `${d.end}T23:59:59Z`,
    fiscalYear: d.fy,
  }));
}

function makeCalendarPeriods(tenantIdx: number): PeriodDef[] {
  // Calendar year: Jan–Dec. 4 periods: FY2021–FY2024
  const fyDefs = [
    { label: 'FY 2021', fy: '2021', start: '2021-01-01', end: '2021-12-31', suffix: 'E01' },
    { label: 'FY 2022', fy: '2022', start: '2022-01-01', end: '2022-12-31', suffix: 'E02' },
    { label: 'FY 2023', fy: '2023', start: '2023-01-01', end: '2023-12-31', suffix: 'E03' },
    { label: 'FY 2024', fy: '2024', start: '2024-01-01', end: '2024-12-31', suffix: 'E04' },
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
  values: { fyIndex: number; numericValue?: number; textValue?: string }[];
}

function parseNumericOrText(raw: string): { numericValue?: number; textValue?: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '\u2014' || trimmed === 'N/A' || trimmed === 'NA' || trimmed === 'n/d') return null;

  const upper = trimmed.toUpperCase();
  if (upper === 'Y' || upper === 'YES') return { textValue: 'Y' };
  if (upper === 'N' || upper === 'NO') return { textValue: 'N' };

  const cleaned = trimmed.replace(/,/g, '').replace(/\s/g, '');
  const num = Number(cleaned);
  if (!isNaN(num) && isFinite(num)) return { numericValue: num };

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

    // BRSR Updated: FY values in cols 6(FY2022), 7(FY2023), 8(FY2024), 9(FY2025)
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 4; fyIdx++) {
      const cellVal = cellStr(row.getCell(6 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section, values });
  });

  return rows;
}

function parseSASBSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const standard = cellStr(row.getCell(1).value);
    const topic = cellStr(row.getCell(3).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(standard)) return;

    const pillar = inferPillarSASB(topic);
    const code = generateCode('SASB', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // SASB: FY values in cols 7(FY2021), 8(FY2022), 9(FY2023), 10(FY2024)
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 4; fyIdx++) {
      const cellVal = cellStr(row.getCell(7 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section: topic, values });
  });

  return rows;
}

function parseTCFDSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const tcfdPillar = cellStr(row.getCell(1).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(tcfdPillar)) return;

    const pillar = inferPillarTCFD(tcfdPillar);
    const code = generateCode('TCFD', pillar, parameter);

    if (seen.has(code)) return;
    seen.add(code);

    // TCFD: FY values in cols 7(FY2021), 8(FY2022), 9(FY2023), 10(FY2024)
    const values: ParsedRow['values'] = [];
    for (let fyIdx = 0; fyIdx < 4; fyIdx++) {
      const cellVal = cellStr(row.getCell(7 + fyIdx).value);
      const parsed = parseNumericOrText(cellVal);
      if (parsed) values.push({ fyIndex: fyIdx, ...parsed });
    }

    rows.push({ code, paramName: parameter, unit: unit || 'No.', pillar, section: tcfdPillar, values });
  });

  return rows;
}

// ── Industry code updates for all existing tenants ──────────────

const INDUSTRY_CODES: Record<string, { tenantId: string; nicCode: string | null; gicsCode: string }> = {
  infosys:    { tenantId: '10000000-0000-0000-0000-000000000A01', nicCode: '62011', gicsCode: '45102010' },
  tata:       { tenantId: '10000000-0000-0000-0000-000000000A04', nicCode: '24101', gicsCode: '15104050' },
  reliance:   { tenantId: '10000000-0000-0000-0000-000000000A07', nicCode: '19201', gicsCode: '10102040' },
  tcs:        { tenantId: '10000000-0000-0000-0000-000000000A08', nicCode: '62011', gicsCode: '45102010' },
  siemens:    { tenantId: '10000000-0000-0000-0000-000000000A02', nicCode: '27101', gicsCode: '20104010' },
  novo:       { tenantId: '10000000-0000-0000-0000-000000000A09', nicCode: '21001', gicsCode: '35201010' },
  mercedes:   { tenantId: '10000000-0000-0000-0000-000000000A0A', nicCode: '29101', gicsCode: '25102010' },
  volkswagen: { tenantId: '10000000-0000-0000-0000-000000000A0B', nicCode: '29101', gicsCode: '25102010' },
  givaudan:   { tenantId: '10000000-0000-0000-0000-000000000A03', nicCode: '20291', gicsCode: '15101040' },
  walmart:    { tenantId: '10000000-0000-0000-0000-000000000A0C', nicCode: '47111', gicsCode: '30101010' },
  merck:      { tenantId: '10000000-0000-0000-0000-000000000A0D', nicCode: '21001', gicsCode: '35201010' },
  iff:        { tenantId: '10000000-0000-0000-0000-000000000A0E', nicCode: '20291', gicsCode: '15101040' },
};

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('=== GreenMeter BRSR/SASB/TCFD Data Seed ===\n');

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

  const companyData: Map<string, ParsedRow[]> = new Map();
  const workbookCache: Map<string, ExcelJS.Workbook> = new Map();

  async function getWorkbook(file: string): Promise<ExcelJS.Workbook> {
    let wb = workbookCache.get(file);
    if (!wb) {
      wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(SEED_DIR, file));
      workbookCache.set(file, wb);
    }
    return wb;
  }

  // Parse new tenant sheets
  for (const t of NEW_TENANTS) {
    const wb = await getWorkbook(t.file);
    const ws = wb.getWorksheet(t.sheetName);
    if (!ws) {
      console.error(`  WARNING: Sheet "${t.sheetName}" not found in ${t.file}, skipping ${t.name}`);
      continue;
    }

    let rows: ParsedRow[];
    if (t.standard === 'BRSR') rows = parseBRSRSheet(ws);
    else if (t.standard === 'SASB') rows = parseSASBSheet(ws);
    else rows = parseTCFDSheet(ws);

    companyData.set(t.key, rows);
    const totalValues = rows.reduce((sum, r) => sum + r.values.length, 0);
    console.log(`  ${t.name}: ${rows.length} params, ${totalValues} data points`);
  }

  // Parse overlap sheets
  for (const o of OVERLAPS) {
    const wb = await getWorkbook(o.file);
    const ws = wb.getWorksheet(o.sheetName);
    if (!ws) {
      console.error(`  WARNING: Sheet "${o.sheetName}" not found in ${o.file}, skipping ${o.name}`);
      continue;
    }

    let rows: ParsedRow[];
    if (o.parser === 'brsr') rows = parseBRSRSheet(ws);
    else rows = parseSASBSheet(ws);

    companyData.set(`overlap:${o.key}`, rows);
    const totalValues = rows.reduce((sum, r) => sum + r.values.length, 0);
    console.log(`  ${o.name} (overlap): ${rows.length} params, ${totalValues} data points`);
  }

  // ── Phase 2: Upsert new tenants ──
  console.log('\n[2/8] Upserting tenants...');
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
    console.log(`  [tenant] ${t.name} (${t.country}, ${t.currency})`);
  }

  // Update Walmart frameworks to include SASB
  await sql`
    UPDATE tenants
    SET active_frameworks = array_append(
      CASE WHEN NOT (active_frameworks @> ARRAY['SASB']::text[]) THEN active_frameworks ELSE active_frameworks END,
      'SASB'
    )
    WHERE tenant_id = ${EXISTING.walmart}::uuid
      AND NOT (active_frameworks @> ARRAY['SASB']::text[])
  `;

  // ── Phase 3: Upsert admin users ──
  console.log('\n[3/8] Upserting admin users...');
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
  console.log('\n[4/8] Upserting org nodes...');
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
  console.log('\n[5/8] Creating reporting periods...');
  let periodsCreated = 0;

  // Map: `key:fyIndex` → periodId
  const periodMap: Map<string, string> = new Map();

  // New tenants
  for (let i = 0; i < NEW_TENANTS.length; i++) {
    const t = NEW_TENANTS[i];
    const tenantIdx = 20 + i; // offset to not conflict with seed-excel-data.ts
    const periods = t.fiscalYearStart === 4
      ? makeNewBRSRPeriods(tenantIdx)
      : makeCalendarPeriods(tenantIdx);

    for (let j = 0; j < periods.length; j++) {
      const p = periods[j];
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
      periodMap.set(`${t.key}:${j}`, p.periodId);
      periodsCreated++;
    }
    const names = periods.map(p => p.name).join(', ');
    console.log(`  [periods] ${t.name}: ${names}`);
  }

  // Overlap tenants — create new periods that don't exist yet
  for (const o of OVERLAPS) {
    if (o.parser === 'brsr') {
      // BRSR overlap: add FY 2021-22 through FY 2024-25 (some may already exist)
      const fyDefs = [
        { label: 'FY 2021-22', fy: '2021-22', start: '2021-04-01', end: '2022-03-31' },
        { label: 'FY 2022-23', fy: '2022-23', start: '2022-04-01', end: '2023-03-31' },
        { label: 'FY 2023-24', fy: '2023-24', start: '2023-04-01', end: '2024-03-31' },
        { label: 'FY 2024-25', fy: '2024-25', start: '2024-04-01', end: '2025-03-31' },
      ];
      for (let j = 0; j < fyDefs.length; j++) {
        const d = fyDefs[j];
        const newPeriodId = randomUUID();
        // Try to insert; if name+tenant already exists, skip
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
        // Query back to get the actual period ID (might be existing)
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
    } else {
      // SASB overlap (Walmart): add FY2021–FY2024 calendar periods
      const fyDefs = [
        { label: 'FY 2021', fy: '2021', start: '2021-01-01', end: '2021-12-31' },
        { label: 'FY 2022', fy: '2022', start: '2022-01-01', end: '2022-12-31' },
        { label: 'FY 2023', fy: '2023', start: '2023-01-01', end: '2023-12-31' },
        { label: 'FY 2024', fy: '2024', start: '2024-01-01', end: '2024-12-31' },
      ];
      for (let j = 0; j < fyDefs.length; j++) {
        const d = fyDefs[j];
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
      console.log(`  [periods] ${o.name} (overlap SASB): ${fyDefs.map(d => d.label).join(', ')}`);
    }
  }

  // ── Phase 6: Clone global kpi_parameters per tenant ──
  console.log('\n[6/8] Cloning KPI parameters per tenant...');
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

  // Clone SASB params for Walmart (overlap)
  for (const o of OVERLAPS) {
    if (o.standard === 'SASB') {
      const globalParams = await sql`
        SELECT param_id, canonical_id, standard, standard_section, standard_code, disclosure,
               code, name, description, pillar, unit, data_type, category,
               indicator_type, computation_method, how_to_measure, how_to_compute,
               how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
        FROM kpi_parameters
        WHERE tenant_id IS NULL AND standard = 'SASB'
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
      console.log(`  [params] ${o.name} (SASB clone): ${cloned} cloned`);
    }

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
  console.log('\n[7/8] Inserting KPI values from Excel data...');
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

  // ── Phase 8: Update industry codes for ALL existing tenants ──
  console.log('\n[8/8] Updating industry codes...');
  let codesUpdated = 0;

  for (const [key, ic] of Object.entries(INDUSTRY_CODES)) {
    await sql`
      UPDATE tenants
      SET nic_code = ${ic.nicCode}, gics_code = ${ic.gicsCode}
      WHERE tenant_id = ${ic.tenantId}::uuid
    `;
    codesUpdated++;
    console.log(`  [industry] ${key}: NIC=${ic.nicCode ?? '—'}, GICS=${ic.gicsCode}`);
  }

  // ── Summary ──
  console.log('\n=== Summary ===');
  console.log(`  New tenants:        ${tenantsCreated}`);
  console.log(`  Admin users:        ${usersCreated}`);
  console.log(`  Org nodes:          ${nodesCreated}`);
  console.log(`  Reporting periods:  ${periodsCreated}`);
  console.log(`  Params cloned:      ${totalCloned}`);
  console.log(`  Values inserted:    ${totalInserted}`);
  console.log(`  Values skipped:     ${totalSkipped}`);
  console.log(`  Industry codes set: ${codesUpdated}`);
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

  console.log('\n=== Available logins (new companies) ===');
  for (const t of NEW_TENANTS) {
    console.log(`  ${t.adminEmail.padEnd(40)} / ${t.adminPassword.padEnd(20)} \u2192 ${t.name}`);
  }

  console.log('\n=== BRSR/SASB/TCFD data seed complete! ===');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
