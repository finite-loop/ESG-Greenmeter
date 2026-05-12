import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

// ── Fixed UUIDs ─────────────────────────────────────────────────
// Deterministic so re-running is idempotent via ON CONFLICT DO NOTHING.

const T = {
  infosys:   '10000000-0000-0000-0000-000000000A01',
  siemens:   '10000000-0000-0000-0000-000000000A02',
  givaudan:  '10000000-0000-0000-0000-000000000A03',
  tata:      '10000000-0000-0000-0000-000000000A04',
  hdfc:      '10000000-0000-0000-0000-000000000A05',
  drreddy:   '10000000-0000-0000-0000-000000000A06',
} as const;

type TenantKey = keyof typeof T;

// Users — 1 admin per tenant + demo user on infosys
const U = {
  infosys:   '20000000-0000-0000-0000-000000000A01',
  siemens:   '20000000-0000-0000-0000-000000000A02',
  givaudan:  '20000000-0000-0000-0000-000000000A03',
  tata:      '20000000-0000-0000-0000-000000000A04',
  hdfc:      '20000000-0000-0000-0000-000000000A05',
  drreddy:   '20000000-0000-0000-0000-000000000A06',
  demo:      '20000000-0000-0000-0000-000000000A07',
} as const;

// Root org nodes (company HQ, level 0)
const N = {
  infosys:   '30000000-0000-0000-0000-000000000A01',
  siemens:   '30000000-0000-0000-0000-000000000A02',
  givaudan:  '30000000-0000-0000-0000-000000000A03',
  tata:      '30000000-0000-0000-0000-000000000A04',
  hdfc:      '30000000-0000-0000-0000-000000000A05',
  drreddy:   '30000000-0000-0000-0000-000000000A06',
} as const;

// Child org nodes (3 per tenant) — UUID suffix Bxx
const childNodes: Record<TenantKey, { id: string; name: string; code: string }[]> = {
  infosys: [
    { id: '30000000-0000-0000-0000-000000000B01', name: 'Digital Services', code: 'INF-DS' },
    { id: '30000000-0000-0000-0000-000000000B02', name: 'Consulting', code: 'INF-CON' },
    { id: '30000000-0000-0000-0000-000000000B03', name: 'Products & Platforms', code: 'INF-PP' },
  ],
  siemens: [
    { id: '30000000-0000-0000-0000-000000000B04', name: 'Gas & Power', code: 'SIE-GP' },
    { id: '30000000-0000-0000-0000-000000000B05', name: 'Wind Power', code: 'SIE-WP' },
    { id: '30000000-0000-0000-0000-000000000B06', name: 'Transformation', code: 'SIE-TF' },
  ],
  givaudan: [
    { id: '30000000-0000-0000-0000-000000000B07', name: 'Taste & Wellbeing', code: 'GIV-TW' },
    { id: '30000000-0000-0000-0000-000000000B08', name: 'Fragrance & Beauty', code: 'GIV-FB' },
    { id: '30000000-0000-0000-0000-000000000B09', name: 'Supply Chain', code: 'GIV-SC' },
  ],
  tata: [
    { id: '30000000-0000-0000-0000-000000000B10', name: 'Flat Products', code: 'TAT-FP' },
    { id: '30000000-0000-0000-0000-000000000B11', name: 'Long Products', code: 'TAT-LP' },
    { id: '30000000-0000-0000-0000-000000000B12', name: 'Mining Operations', code: 'TAT-MO' },
  ],
  hdfc: [
    { id: '30000000-0000-0000-0000-000000000B13', name: 'Retail Banking', code: 'HDF-RB' },
    { id: '30000000-0000-0000-0000-000000000B14', name: 'Corporate Banking', code: 'HDF-CB' },
    { id: '30000000-0000-0000-0000-000000000B15', name: 'Treasury', code: 'HDF-TR' },
  ],
  drreddy: [
    { id: '30000000-0000-0000-0000-000000000B16', name: 'Global Generics', code: 'DRR-GG' },
    { id: '30000000-0000-0000-0000-000000000B17', name: 'PSAI', code: 'DRR-PS' },
    { id: '30000000-0000-0000-0000-000000000B18', name: 'Biologics', code: 'DRR-BIO' },
  ],
};

// Reporting periods (2 per tenant)
const P = {
  fy2425: 'C01', // suffix — full UUIDs built per-tenant
  fy2526: 'C02',
} as const;

function periodId(tenantKey: TenantKey, suffix: string): string {
  const tenantIdx = Object.keys(T).indexOf(tenantKey) + 1;
  const last = `${tenantIdx}${suffix}`.padStart(12, '0');
  return `40000000-0000-0000-0000-${last}`;
}

// ── Tenant definitions ──────────────────────────────────────────

interface TenantDef {
  key: TenantKey;
  name: string;
  domain: string;
  sector: string;
  country: string;
  currency: string;
  frameworks: string[];
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

const TENANTS: TenantDef[] = [
  { key: 'infosys', name: 'Infosys Technologies', domain: 'infosys-demo.com', sector: 'IT Services', country: 'India', currency: 'INR', frameworks: ['BRSR', 'GRI'], adminEmail: 'admin@infosys-demo.com', adminName: 'Rajesh Kumar', adminPassword: 'Infosys@2026' },
  { key: 'siemens', name: 'Siemens Energy AG', domain: 'siemens-demo.com', sector: 'Industrial Manufacturing', country: 'Germany', currency: 'EUR', frameworks: ['ESRS', 'GRI'], adminEmail: 'admin@siemens-demo.com', adminName: 'Hans Mueller', adminPassword: 'Siemens@2026' },
  { key: 'givaudan', name: 'Givaudan SA', domain: 'givaudan-demo.com', sector: 'Specialty Chemicals', country: 'Switzerland', currency: 'CHF', frameworks: ['GRI', 'ESRS'], adminEmail: 'admin@givaudan-demo.com', adminName: 'Marie Dupont', adminPassword: 'Givaudan@2026' },
  { key: 'tata', name: 'Tata Steel Industries', domain: 'tatasteel-demo.com', sector: 'Steel & Mining', country: 'India', currency: 'INR', frameworks: ['BRSR', 'GRI'], adminEmail: 'admin@tatasteel-demo.com', adminName: 'Arjun Mehta', adminPassword: 'TataSteel@2026' },
  { key: 'hdfc', name: 'HDFC Banking Group', domain: 'hdfcbank-demo.com', sector: 'Financial Services', country: 'India', currency: 'INR', frameworks: ['BRSR', 'GRI'], adminEmail: 'admin@hdfcbank-demo.com', adminName: 'Priya Sharma', adminPassword: 'HDFC@2026' },
  { key: 'drreddy', name: "Dr. Reddy's Laboratories", domain: 'drreddy-demo.com', sector: 'Pharmaceuticals', country: 'India', currency: 'INR', frameworks: ['BRSR', 'GRI', 'ESRS'], adminEmail: 'admin@drreddy-demo.com', adminName: 'Vikram Reddy', adminPassword: 'DrReddy@2026' },
];

const DEMO_PASSWORD = 'Demo@2026';

// ── Canonical metric KPI values ─────────────────────────────────
// Values for FY 2025-26 (current). FY 2024-25 uses 0.92× factor.

interface MetricValue {
  canonicalName: string;
  values: Record<TenantKey, number>;
}

const METRIC_VALUES: MetricValue[] = [
  { canonicalName: 'GHG Scope 1 Emissions', values: { infosys: 45000, tata: 28500000, hdfc: 12000, drreddy: 85000, siemens: 320000, givaudan: 180000 } },
  { canonicalName: 'GHG Scope 2 Emissions (Location-Based)', values: { infosys: 380000, tata: 4200000, hdfc: 95000, drreddy: 120000, siemens: 450000, givaudan: 210000 } },
  { canonicalName: 'GHG Scope 3 Emissions', values: { infosys: 1200000, tata: 15000000, hdfc: 280000, drreddy: 450000, siemens: 2800000, givaudan: 980000 } },
  { canonicalName: 'Total Energy Consumption', values: { infosys: 5800000, tata: 410000000, hdfc: 1200000, drreddy: 3400000, siemens: 18000000, givaudan: 8500000 } },
  { canonicalName: 'Renewable Energy Consumption', values: { infosys: 62, tata: 18, hdfc: 35, drreddy: 28, siemens: 45, givaudan: 52 } },
  { canonicalName: 'Total Water Withdrawal', values: { infosys: 8200, tata: 42000, hdfc: 1800, drreddy: 12500, siemens: 6800, givaudan: 15200 } },
  { canonicalName: 'Water Recycled', values: { infosys: 45, tata: 28, hdfc: 32, drreddy: 38, siemens: 42, givaudan: 55 } },
  { canonicalName: 'Total Waste Generated', values: { infosys: 12000, tata: 8500000, hdfc: 4500, drreddy: 28000, siemens: 125000, givaudan: 45000 } },
  { canonicalName: 'Waste Diverted from Disposal', values: { infosys: 78, tata: 65, hdfc: 72, drreddy: 58, siemens: 71, givaudan: 82 } },
  { canonicalName: 'Total Employees', values: { infosys: 314000, tata: 75000, hdfc: 142000, drreddy: 24800, siemens: 96000, givaudan: 16200 } },
  { canonicalName: 'Female Employees Ratio', values: { infosys: 39.2, tata: 8.5, hdfc: 22.8, drreddy: 31.5, siemens: 26.4, givaudan: 38.1 } },
  { canonicalName: 'Board Independence', values: { infosys: 72, tata: 65, hdfc: 78, drreddy: 70, siemens: 68, givaudan: 75 } },
  { canonicalName: 'Board Gender Diversity', values: { infosys: 33, tata: 15, hdfc: 25, drreddy: 30, siemens: 28, givaudan: 35 } },
  { canonicalName: 'Training Hours per Employee', values: { infosys: 85, tata: 42, hdfc: 55, drreddy: 48, siemens: 62, givaudan: 72 } },
  { canonicalName: 'Lost-Time Injury Frequency Rate', values: { infosys: 0.12, tata: 1.85, hdfc: 0.08, drreddy: 0.45, siemens: 0.65, givaudan: 0.32 } },
  { canonicalName: 'Employee Turnover Rate', values: { infosys: 18.5, tata: 8.2, hdfc: 14.8, drreddy: 12.3, siemens: 10.5, givaudan: 7.8 } },
  { canonicalName: 'Ethics Violations Reported', values: { infosys: 2, tata: 5, hdfc: 8, drreddy: 1, siemens: 3, givaudan: 0 } },
];

// ── Scoring weights (pillar-level) ──────────────────────────────

const SCORING_WEIGHTS: Record<TenantKey, { E: number; S: number; G: number }> = {
  infosys: { E: 30, S: 35, G: 35 },
  tata:    { E: 50, S: 25, G: 25 },
  siemens: { E: 50, S: 25, G: 25 },
  hdfc:    { E: 25, S: 35, G: 40 },
  drreddy: { E: 35, S: 40, G: 25 },
  givaudan:{ E: 45, S: 30, G: 25 },
};

// ── Goals ───────────────────────────────────────────────────────

interface GoalDef {
  tenantKey: TenantKey;
  name: string;
  description: string;
  canonicalName: string;
  targetValue: string;
  baselineValue: string;
  baselineYear: string;
  targetYear: string;
  unit: string;
  direction: string;
}

const GOALS: GoalDef[] = [
  { tenantKey: 'infosys', name: 'Carbon Neutral by 2040', description: 'Achieve net-zero Scope 1+2 emissions', canonicalName: 'GHG Scope 1 Emissions', targetValue: '0', baselineValue: '45000', baselineYear: '2024-25', targetYear: '2040', unit: 'tCO2e', direction: 'lower_is_better' },
  { tenantKey: 'infosys', name: '80% Renewable Energy', description: 'Transition to 80% renewable energy sources', canonicalName: 'Renewable Energy Consumption', targetValue: '80', baselineValue: '62', baselineYear: '2024-25', targetYear: '2028', unit: '%', direction: 'higher_is_better' },
  { tenantKey: 'tata', name: 'Net Zero by 2045', description: 'Achieve net-zero across all scopes', canonicalName: 'GHG Scope 1 Emissions', targetValue: '0', baselineValue: '28500000', baselineYear: '2024-25', targetYear: '2045', unit: 'tCO2e', direction: 'lower_is_better' },
  { tenantKey: 'tata', name: 'Zero Waste to Landfill', description: 'Achieve 95% waste diversion rate', canonicalName: 'Waste Diverted from Disposal', targetValue: '95', baselineValue: '65', baselineYear: '2024-25', targetYear: '2030', unit: '%', direction: 'higher_is_better' },
  { tenantKey: 'hdfc', name: 'Green Building Portfolio', description: 'Reduce operational energy consumption by 30%', canonicalName: 'Total Energy Consumption', targetValue: '840000', baselineValue: '1200000', baselineYear: '2024-25', targetYear: '2030', unit: 'GJ', direction: 'lower_is_better' },
  { tenantKey: 'drreddy', name: '50% Renewable Energy by 2028', description: 'Double renewable energy share', canonicalName: 'Renewable Energy Consumption', targetValue: '50', baselineValue: '28', baselineYear: '2024-25', targetYear: '2028', unit: '%', direction: 'higher_is_better' },
  { tenantKey: 'siemens', name: 'Climate Neutral Operations', description: 'Net-zero Scope 1+2 by 2030', canonicalName: 'GHG Scope 1 Emissions', targetValue: '0', baselineValue: '320000', baselineYear: '2024-25', targetYear: '2030', unit: 'tCO2e', direction: 'lower_is_better' },
  { tenantKey: 'givaudan', name: 'Zero Waste Operations', description: 'Achieve 95% waste recycling', canonicalName: 'Waste Diverted from Disposal', targetValue: '95', baselineValue: '82', baselineYear: '2024-25', targetYear: '2030', unit: '%', direction: 'higher_is_better' },
  { tenantKey: 'givaudan', name: '100% Renewable Electricity', description: 'Full renewable electricity sourcing', canonicalName: 'Renewable Energy Consumption', targetValue: '100', baselineValue: '52', baselineYear: '2024-25', targetYear: '2030', unit: '%', direction: 'higher_is_better' },
];

// ── Recommendations ─────────────────────────────────────────────

interface RecDef {
  tenantKey: TenantKey;
  metric: string;
  text: string;
  priority: string;
  pillar: string;
  category: string;
}

const RECOMMENDATIONS: RecDef[] = [
  // Infosys
  { tenantKey: 'infosys', metric: 'Employee Turnover Rate', text: 'Attrition rate of 18.5% is above industry average. Consider enhanced retention programs and career development paths.', priority: 'warning', pillar: 'S', category: 'Workforce' },
  { tenantKey: 'infosys', metric: 'GHG Scope 3 Emissions', text: 'Scope 3 emissions represent 74% of total carbon footprint. Engage top suppliers on science-based targets.', priority: 'warning', pillar: 'E', category: 'Emissions' },
  { tenantKey: 'infosys', metric: 'Water Recycled', text: 'Water recycling at 45% has room for improvement. Implement closed-loop cooling in data centres.', priority: 'info', pillar: 'E', category: 'Water' },
  // Tata Steel
  { tenantKey: 'tata', metric: 'GHG Scope 1 Emissions', text: 'Scope 1 emissions of 28.5M tCO2e are sector-leading challenge. Accelerate hydrogen-based DRI adoption.', priority: 'critical', pillar: 'E', category: 'Emissions' },
  { tenantKey: 'tata', metric: 'Female Employees Ratio', text: 'Female workforce at 8.5% is critically low. Set gender targets for new recruitment and STEM pipeline programs.', priority: 'critical', pillar: 'S', category: 'Workforce' },
  { tenantKey: 'tata', metric: 'Lost-Time Injury Frequency Rate', text: 'LTIFR of 1.85 needs reduction. Implement predictive safety analytics using IoT sensors.', priority: 'warning', pillar: 'S', category: 'Health & Safety' },
  // HDFC
  { tenantKey: 'hdfc', metric: 'Ethics Violations Reported', text: '8 ethics violations reported — highest among peers. Strengthen whistleblower protection and compliance training.', priority: 'critical', pillar: 'G', category: 'Ethics' },
  { tenantKey: 'hdfc', metric: 'Female Employees Ratio', text: 'Female representation at 22.8% trails sector leaders. Launch returnship programs for women professionals.', priority: 'warning', pillar: 'S', category: 'Workforce' },
  { tenantKey: 'hdfc', metric: 'Renewable Energy Consumption', text: 'Renewable energy at 35% is below potential. Install rooftop solar across branch network.', priority: 'info', pillar: 'E', category: 'Energy' },
  // Dr. Reddy's
  { tenantKey: 'drreddy', metric: 'Waste Diverted from Disposal', text: 'Waste diversion at 58% is the lowest in peer group. Adopt zero-liquid-discharge in API manufacturing.', priority: 'warning', pillar: 'E', category: 'Waste' },
  { tenantKey: 'drreddy', metric: 'Renewable Energy Consumption', text: 'Renewable share at 28% needs acceleration to meet 2028 target. Explore PPAs for wind and solar.', priority: 'warning', pillar: 'E', category: 'Energy' },
  { tenantKey: 'drreddy', metric: 'Training Hours per Employee', text: 'Training hours at 48 are below peer average. Increase digital learning and GMP training modules.', priority: 'info', pillar: 'S', category: 'Workforce' },
  // Siemens
  { tenantKey: 'siemens', metric: 'GHG Scope 1 Emissions', text: 'Scope 1 at 320K tCO2e — focus on SF6-free switchgear and fleet electrification for 2030 target.', priority: 'warning', pillar: 'E', category: 'Emissions' },
  { tenantKey: 'siemens', metric: 'Board Gender Diversity', text: 'Board diversity at 28% trails European peers. Consider diversity targets for next board renewal cycle.', priority: 'info', pillar: 'G', category: 'Governance' },
  { tenantKey: 'siemens', metric: 'Lost-Time Injury Frequency Rate', text: 'LTIFR of 0.65 is above target. Expand safety leadership program to all manufacturing sites.', priority: 'warning', pillar: 'S', category: 'Health & Safety' },
  // Givaudan
  { tenantKey: 'givaudan', metric: 'Total Water Withdrawal', text: 'Water withdrawal at 15,200 ML is significant. Implement water stewardship in high-stress regions.', priority: 'info', pillar: 'E', category: 'Water' },
  { tenantKey: 'givaudan', metric: 'Employee Turnover Rate', text: 'Low turnover of 7.8% is a strength. Continue competitive benefits and purpose-driven culture.', priority: 'info', pillar: 'S', category: 'Workforce' },
  { tenantKey: 'givaudan', metric: 'GHG Scope 3 Emissions', text: 'Supply chain emissions are the largest footprint. Expand sustainable sourcing for natural ingredients.', priority: 'warning', pillar: 'E', category: 'Emissions' },
];

// ── Thresholds for canonical metrics ────────────────────────────

interface ThresholdDef {
  canonicalName: string;
  pillar: string;
  category: string;
  redMax: string;
  amberMax: string;
  unit: string;
}

const THRESHOLDS: ThresholdDef[] = [
  { canonicalName: 'GHG Scope 1 Emissions', pillar: 'E', category: 'Emissions', redMax: '500000', amberMax: '100000', unit: 'tCO2e' },
  { canonicalName: 'GHG Scope 2 Emissions (Location-Based)', pillar: 'E', category: 'Emissions', redMax: '1000000', amberMax: '200000', unit: 'tCO2e' },
  { canonicalName: 'Renewable Energy Consumption', pillar: 'E', category: 'Energy', redMax: '20', amberMax: '50', unit: '%' },
  { canonicalName: 'Water Recycled', pillar: 'E', category: 'Water', redMax: '20', amberMax: '40', unit: '%' },
  { canonicalName: 'Waste Diverted from Disposal', pillar: 'E', category: 'Waste', redMax: '40', amberMax: '65', unit: '%' },
  { canonicalName: 'Female Employees Ratio', pillar: 'S', category: 'Workforce', redMax: '15', amberMax: '30', unit: '%' },
  { canonicalName: 'Training Hours per Employee', pillar: 'S', category: 'Workforce', redMax: '20', amberMax: '50', unit: 'hours' },
  { canonicalName: 'Lost-Time Injury Frequency Rate', pillar: 'S', category: 'Health & Safety', redMax: '2', amberMax: '0.5', unit: 'per Mhrs' },
  { canonicalName: 'Board Independence', pillar: 'G', category: 'Governance', redMax: '40', amberMax: '60', unit: '%' },
  { canonicalName: 'Board Gender Diversity', pillar: 'G', category: 'Governance', redMax: '15', amberMax: '25', unit: '%' },
  { canonicalName: 'Employee Turnover Rate', pillar: 'S', category: 'Workforce', redMax: '25', amberMax: '15', unit: '%' },
  { canonicalName: 'Ethics Violations Reported', pillar: 'G', category: 'Ethics', redMax: '10', amberMax: '3', unit: 'count' },
];

// ── Main seed function ──────────────────────────────────────────

async function main() {
  console.log('=== GreenMeter Demo Seed ===\n');

  // ── 3a. Tenants ──
  console.log('[1/12] Seeding tenants...');
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
        4,
        ${t.frameworks}::text[],
        true,
        true
      )
      ON CONFLICT (tenant_id) DO NOTHING
    `;
    console.log(`  [tenant] ${t.name}`);
  }

  // ── 3b. Users ──
  console.log('\n[2/12] Seeding users...');
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
    console.log(`  [user] ${t.adminEmail} / ${t.adminPassword}`);
  }
  // Demo user → Infosys tenant
  const demoHash = hashSync(DEMO_PASSWORD, 10);
  await sql`
    INSERT INTO users (user_id, tenant_id, name, email, password_hash, role, status)
    VALUES (
      ${U.demo}::uuid,
      ${T.infosys}::uuid,
      'Demo User',
      'demo@greenmeter.ai',
      ${demoHash},
      'admin',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET password_hash = ${demoHash}
  `;
  console.log(`  [user] demo@greenmeter.ai / ${DEMO_PASSWORD} → Infosys`);

  // Platform admin → Infosys tenant
  const PLATFORM_ADMIN_PASSWORD = 'Admin@2026';
  const platformAdminHash = hashSync(PLATFORM_ADMIN_PASSWORD, 10);
  await sql`
    INSERT INTO users (user_id, tenant_id, name, email, password_hash, role, status)
    VALUES (
      ${'20000000-0000-0000-0000-000000000A08'}::uuid,
      ${T.infosys}::uuid,
      'Platform Admin',
      'admin@greenmeter.ai',
      ${platformAdminHash},
      'admin',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET password_hash = ${platformAdminHash}
  `;
  console.log(`  [user] admin@greenmeter.ai / ${PLATFORM_ADMIN_PASSWORD} → Infosys (Platform Admin)`);

  // ── 3c. Org hierarchy ──
  console.log('\n[3/12] Seeding org nodes...');
  for (const t of TENANTS) {
    // Root node
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
    console.log(`  [org] ${t.name} (root)`);

    // Child nodes
    for (const child of childNodes[t.key]) {
      await sql`
        INSERT INTO org_nodes (node_id, tenant_id, parent_node_id, name, node_type, code, level, active)
        VALUES (
          ${child.id}::uuid,
          ${T[t.key]}::uuid,
          ${N[t.key]}::uuid,
          ${child.name},
          'division',
          ${child.code},
          1,
          true
        )
        ON CONFLICT (node_id) DO NOTHING
      `;
      console.log(`  [org]   └─ ${child.name}`);
    }
  }

  // ── 3d. Reporting periods ──
  console.log('\n[4/12] Seeding reporting periods...');
  for (const t of TENANTS) {
    const pid2425 = periodId(t.key, P.fy2425);
    const pid2526 = periodId(t.key, P.fy2526);

    await sql`
      INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
      VALUES (
        ${pid2425}::uuid, ${T[t.key]}::uuid, 'FY 2024-25',
        '2024-04-01T00:00:00Z', '2025-03-31T23:59:59Z', '2024-25', 'closed', true, true
      )
      ON CONFLICT (period_id) DO NOTHING
    `;
    await sql`
      INSERT INTO reporting_periods (period_id, tenant_id, name, start_date, end_date, fiscal_year, status, locked, active)
      VALUES (
        ${pid2526}::uuid, ${T[t.key]}::uuid, 'FY 2025-26',
        '2025-04-01T00:00:00Z', '2026-03-31T23:59:59Z', '2025-26', 'open', false, true
      )
      ON CONFLICT (period_id) DO NOTHING
    `;
    console.log(`  [period] ${t.name}: FY 2024-25 (closed), FY 2025-26 (open)`);
  }

  // ── 3e. Clone global kpi_parameters per tenant ──
  console.log('\n[5/12] Cloning KPI parameters per tenant...');

  // First, get all global params with a canonical_id
  const globalParams = await sql`
    SELECT param_id, canonical_id, standard, standard_section, standard_code, disclosure,
           code, name, description, pillar, unit, data_type, category,
           indicator_type, computation_method, how_to_measure, how_to_compute,
           how_to_report, direction, rollup_method, status, src, depts, standards, priority_order
    FROM kpi_parameters
    WHERE tenant_id IS NULL AND canonical_id IS NOT NULL
  `;

  console.log(`  Found ${globalParams.length} global params with canonical_id`);

  // Track tenant-specific param IDs keyed by (tenantKey, canonicalId)
  const tenantParamMap: Map<string, string> = new Map();

  for (const t of TENANTS) {
    let cloned = 0;
    for (const gp of globalParams) {
      const newParamId = randomUUID();
      const mapKey = `${t.key}:${gp.canonical_id}`;
      // Only store the first param per canonical metric per tenant
      if (!tenantParamMap.has(mapKey)) {
        tenantParamMap.set(mapKey, newParamId);
      }

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
    console.log(`  [params] ${t.name}: ${cloned} params cloned`);
  }

  // Rebuild tenantParamMap from DB (handles re-runs where ON CONFLICT DO NOTHING kept old UUIDs)
  console.log('  Rebuilding param map from DB...');
  tenantParamMap.clear();
  for (const t of TENANTS) {
    const existingParams = await sql`
      SELECT param_id, canonical_id FROM kpi_parameters
      WHERE tenant_id = ${T[t.key]}::uuid AND canonical_id IS NOT NULL
    `;
    for (const ep of existingParams) {
      const mapKey = `${t.key}:${ep.canonical_id}`;
      if (!tenantParamMap.has(mapKey)) {
        tenantParamMap.set(mapKey, ep.param_id);
      }
    }
  }
  console.log(`  Param map rebuilt: ${tenantParamMap.size} entries`);

  // ── 3f. KPI Values ──
  console.log('\n[6/12] Seeding KPI values...');

  // Build canonical name → canonical_id map
  const canonicalRows = await sql`
    SELECT canonical_id, canonical_name FROM canonical_metrics
  `;
  const canonicalMap = new Map<string, string>();
  for (const r of canonicalRows) {
    canonicalMap.set(r.canonical_name, r.canonical_id);
  }

  for (const t of TENANTS) {
    let valCount = 0;
    const pid2425 = periodId(t.key, P.fy2425);
    const pid2526 = periodId(t.key, P.fy2526);

    for (const mv of METRIC_VALUES) {
      const cid = canonicalMap.get(mv.canonicalName);
      if (!cid) continue;

      const mapKey = `${t.key}:${cid}`;
      const paramId = tenantParamMap.get(mapKey);
      if (!paramId) continue;

      const currentValue = mv.values[t.key];
      const prevValue = Math.round(currentValue * 0.92 * 100) / 100; // previous year slightly lower

      // FY 2025-26 (current)
      await sql`
        INSERT INTO kpi_values (value_id, tenant_id, param_id, canonical_id, node_id, period_id, value, source_type, verified)
        VALUES (
          ${randomUUID()}::uuid, ${T[t.key]}::uuid, ${paramId}::uuid, ${cid}::uuid,
          ${N[t.key]}::uuid, ${pid2526}::uuid, ${String(currentValue)}, 'seed', true
        )
        ON CONFLICT ON CONSTRAINT uq_kpi_values_tenant_param_node_period DO NOTHING
      `;

      // FY 2024-25 (previous)
      await sql`
        INSERT INTO kpi_values (value_id, tenant_id, param_id, canonical_id, node_id, period_id, value, source_type, verified)
        VALUES (
          ${randomUUID()}::uuid, ${T[t.key]}::uuid, ${paramId}::uuid, ${cid}::uuid,
          ${N[t.key]}::uuid, ${pid2425}::uuid, ${String(prevValue)}, 'seed', true
        )
        ON CONFLICT ON CONSTRAINT uq_kpi_values_tenant_param_node_period DO NOTHING
      `;
      valCount += 2;
    }
    console.log(`  [values] ${t.name}: ${valCount} values`);
  }

  // ── 3g. Peer organisations ──
  console.log('\n[7/12] Seeding peer organisations...');

  // Each tenant gets the other 5 as peers
  const peerIdMap: Map<string, string> = new Map(); // key: `ownerKey:peerKey`

  for (const owner of TENANTS) {
    for (const peer of TENANTS) {
      if (owner.key === peer.key) continue;
      const peerId = randomUUID();
      peerIdMap.set(`${owner.key}:${peer.key}`, peerId);

      await sql`
        INSERT INTO peer_organisations (peer_id, tenant_id, name, sector, country, market_cap, active)
        VALUES (
          ${peerId}::uuid,
          ${T[owner.key]}::uuid,
          ${peer.name},
          ${peer.sector},
          ${peer.country},
          'large_cap',
          true
        )
        ON CONFLICT (peer_id) DO NOTHING
      `;
    }
    console.log(`  [peers] ${owner.name}: 5 peer companies`);
  }

  // ── 3h. Peer KPI values ──
  console.log('\n[8/12] Seeding peer KPI values...');

  for (const owner of TENANTS) {
    let peerValCount = 0;

    for (const peer of TENANTS) {
      if (owner.key === peer.key) continue;
      const peerId = peerIdMap.get(`${owner.key}:${peer.key}`);
      if (!peerId) continue;

      for (const mv of METRIC_VALUES) {
        const cid = canonicalMap.get(mv.canonicalName);
        if (!cid) continue;

        // Use the owner's tenant-specific param for this canonical metric
        const mapKey = `${owner.key}:${cid}`;
        const paramId = tenantParamMap.get(mapKey);
        if (!paramId) continue;

        const peerValue = mv.values[peer.key];
        const prevPeerValue = Math.round(peerValue * 0.92 * 100) / 100;

        // FY 2025-26
        await sql`
          INSERT INTO peer_kpi_values (peer_value_id, tenant_id, peer_id, param_id, canonical_id, fiscal_year, value, unit, verified)
          VALUES (
            ${randomUUID()}::uuid, ${T[owner.key]}::uuid, ${peerId}::uuid, ${paramId}::uuid,
            ${cid}::uuid, '2025-26', ${String(peerValue)}, 'number', true
          )
          ON CONFLICT ON CONSTRAINT uq_peer_kpi_values_tenant_peer_param_year DO NOTHING
        `;

        // FY 2024-25
        await sql`
          INSERT INTO peer_kpi_values (peer_value_id, tenant_id, peer_id, param_id, canonical_id, fiscal_year, value, unit, verified)
          VALUES (
            ${randomUUID()}::uuid, ${T[owner.key]}::uuid, ${peerId}::uuid, ${paramId}::uuid,
            ${cid}::uuid, '2024-25', ${String(prevPeerValue)}, 'number', true
          )
          ON CONFLICT ON CONSTRAINT uq_peer_kpi_values_tenant_peer_param_year DO NOTHING
        `;
        peerValCount += 2;
      }
    }
    console.log(`  [peer-values] ${owner.name}: ${peerValCount} values`);
  }

  // ── 3i. Scoring weights ──
  console.log('\n[9/12] Seeding scoring weights...');

  // Map categories to pillars
  const categoryPillarMap: Record<string, string> = {
    Emissions: 'E', Energy: 'E', Water: 'E', Waste: 'E',
    Workforce: 'S', 'Health & Safety': 'S',
    Governance: 'G', Ethics: 'G',
  };
  const categories = Object.keys(categoryPillarMap);

  for (const t of TENANTS) {
    const weights = SCORING_WEIGHTS[t.key];

    for (const cat of categories) {
      const pillar = categoryPillarMap[cat];
      const pillarWeight = pillar === 'E' ? weights.E : pillar === 'S' ? weights.S : weights.G;
      // Distribute pillar weight evenly among its categories
      const pillarCats = categories.filter(c => categoryPillarMap[c] === pillar);
      const catWeight = Math.round((pillarWeight / pillarCats.length) * 100) / 100;

      await sql`
        INSERT INTO scoring_weights (weight_id, tenant_id, pillar, category, weight)
        VALUES (${randomUUID()}::uuid, ${T[t.key]}::uuid, ${pillar}, ${cat}, ${String(catWeight)})
        ON CONFLICT ON CONSTRAINT uq_scoring_weights_tenant_pillar_category DO NOTHING
      `;
    }
    console.log(`  [weights] ${t.name}: E=${weights.E} S=${weights.S} G=${weights.G}`);
  }

  // ── 3j. Thresholds ──
  console.log('\n[10/12] Seeding thresholds...');

  for (const t of TENANTS) {
    for (const th of THRESHOLDS) {
      const cid = canonicalMap.get(th.canonicalName);
      const mapKey = `${t.key}:${cid}`;
      const paramId = cid ? tenantParamMap.get(mapKey) : undefined;

      await sql`
        INSERT INTO thresholds (threshold_id, tenant_id, param_id, category, pillar, red_max, amber_max, unit)
        VALUES (
          ${randomUUID()}::uuid, ${T[t.key]}::uuid, ${paramId ?? null},
          ${th.category}, ${th.pillar}, ${th.redMax}, ${th.amberMax}, ${th.unit}
        )
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`  [thresholds] ${t.name}: ${THRESHOLDS.length} thresholds`);
  }

  // ── 3k. Goals ──
  console.log('\n[11/12] Seeding goals...');

  for (const g of GOALS) {
    const cid = canonicalMap.get(g.canonicalName);
    if (!cid) continue;
    const mapKey = `${g.tenantKey}:${cid}`;
    const paramId = tenantParamMap.get(mapKey);
    if (!paramId) continue;

    await sql`
      INSERT INTO goals (goal_id, tenant_id, param_id, canonical_id, name, description, target_value, baseline_value, baseline_year, target_year, unit, direction, status)
      VALUES (
        ${randomUUID()}::uuid, ${T[g.tenantKey]}::uuid, ${paramId}::uuid, ${cid}::uuid,
        ${g.name}, ${g.description}, ${g.targetValue}, ${g.baselineValue},
        ${g.baselineYear}, ${g.targetYear}, ${g.unit}, ${g.direction}, 'active'
      )
      ON CONFLICT DO NOTHING
    `;
    console.log(`  [goal] ${TENANTS.find(t => t.key === g.tenantKey)!.name}: ${g.name}`);
  }

  // ── 3l. Recommendations ──
  console.log('\n[12/12] Seeding recommendations...');

  for (const r of RECOMMENDATIONS) {
    await sql`
      INSERT INTO recommendations (recommendation_id, tenant_id, metric, recommendation_text, priority, source, pillar, category)
      VALUES (
        ${randomUUID()}::uuid, ${T[r.tenantKey]}::uuid,
        ${r.metric}, ${r.text}, ${r.priority}, 'rule', ${r.pillar}, ${r.category}
      )
      ON CONFLICT DO NOTHING
    `;
    console.log(`  [rec] ${TENANTS.find(t => t.key === r.tenantKey)!.name}: ${r.metric} (${r.priority})`);
  }

  console.log('\n=== Demo seed complete! ===');
  console.log('\nAvailable logins:');
  console.log(`  ${'admin@greenmeter.ai'.padEnd(30)} / ${'Admin@2026'.padEnd(18)} → Infosys Technologies (Platform Admin)`);
  console.log(`  ${'demo@greenmeter.ai'.padEnd(30)} / ${DEMO_PASSWORD.padEnd(18)} → Infosys Technologies`);
  for (const t of TENANTS) {
    console.log(`  ${t.adminEmail.padEnd(30)} / ${t.adminPassword.padEnd(18)} → ${t.name}`);
  }
}

main()
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
