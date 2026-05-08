import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { canonicalMetrics, kpiParameters } from '../src/db/schema/kpi';
import { sql, eq, and, isNull, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ── Canonical metric definitions ────────────────────────────────
// Each entry defines a cross-standard concept and the parameter names
// that map to it across BRSR, ESRS, and GRI.

interface CanonicalDef {
  canonicalName: string;
  pillar: string;
  category: string;
  unitFamily: string;
  direction: string;
  description: string;
  paramMatches: {
    standard: string;
    paramNamePattern: string; // exact prefix match against kpi_parameters.name
  }[];
}

const CANONICAL_DEFS: CanonicalDef[] = [
  // ── Environment: Emissions ──
  {
    canonicalName: 'GHG Scope 1 Emissions',
    pillar: 'E', category: 'Emissions', unitFamily: 'mass_co2e', direction: 'lower_is_better',
    description: 'Direct greenhouse gas emissions from owned/controlled sources',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Scope 1 GHG emissions' },
      { standard: 'ESRS', paramNamePattern: 'Scope 1 GHG emissions' },
      { standard: 'GRI', paramNamePattern: 'Scope 1 GHG emissions' },
    ],
  },
  {
    canonicalName: 'GHG Scope 2 Emissions (Location-Based)',
    pillar: 'E', category: 'Emissions', unitFamily: 'mass_co2e', direction: 'lower_is_better',
    description: 'Indirect GHG emissions from purchased electricity (location-based)',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Scope 2 GHG emissions' },
      { standard: 'ESRS', paramNamePattern: 'Scope 2 GHG – location' },
      { standard: 'GRI', paramNamePattern: 'Scope 2 GHG – location' },
    ],
  },
  {
    canonicalName: 'GHG Scope 3 Emissions',
    pillar: 'E', category: 'Emissions', unitFamily: 'mass_co2e', direction: 'lower_is_better',
    description: 'Other indirect GHG emissions across the value chain',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Scope 3 GHG emissions' },
      { standard: 'ESRS', paramNamePattern: 'Scope 3 GHG emissions' },
      { standard: 'GRI', paramNamePattern: 'Scope 3 GHG emissions' },
    ],
  },
  {
    canonicalName: 'GHG Emission Intensity',
    pillar: 'E', category: 'Emissions', unitFamily: 'intensity_co2e', direction: 'lower_is_better',
    description: 'GHG emissions per unit of revenue or production',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'GHG intensity' },
      { standard: 'ESRS', paramNamePattern: 'GHG intensity' },
      { standard: 'GRI', paramNamePattern: 'GHG intensity' },
    ],
  },
  // ── Environment: Energy ──
  {
    canonicalName: 'Total Energy Consumption',
    pillar: 'E', category: 'Energy', unitFamily: 'energy', direction: 'lower_is_better',
    description: 'Total energy consumed from all sources',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Total energy consumption' },
      { standard: 'ESRS', paramNamePattern: 'Total energy consumption' },
      { standard: 'GRI', paramNamePattern: 'Total energy consumption' },
    ],
  },
  {
    canonicalName: 'Renewable Energy Consumption',
    pillar: 'E', category: 'Energy', unitFamily: 'energy', direction: 'higher_is_better',
    description: 'Energy consumed from renewable sources',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Renewable energy' },
      { standard: 'ESRS', paramNamePattern: 'Renewable energy' },
      { standard: 'GRI', paramNamePattern: 'Renewable energy' },
    ],
  },
  {
    canonicalName: 'Energy Intensity',
    pillar: 'E', category: 'Energy', unitFamily: 'intensity_energy', direction: 'lower_is_better',
    description: 'Energy consumption per unit of revenue or production',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Energy intensity' },
      { standard: 'ESRS', paramNamePattern: 'Energy intensity' },
      { standard: 'GRI', paramNamePattern: 'Energy intensity' },
    ],
  },
  // ── Environment: Water ──
  {
    canonicalName: 'Total Water Withdrawal',
    pillar: 'E', category: 'Water', unitFamily: 'volume', direction: 'lower_is_better',
    description: 'Total water withdrawn from all sources',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Water withdrawal' },
      { standard: 'ESRS', paramNamePattern: 'Water withdrawal' },
      { standard: 'GRI', paramNamePattern: 'Water withdrawal' },
    ],
  },
  {
    canonicalName: 'Water Recycled',
    pillar: 'E', category: 'Water', unitFamily: 'volume', direction: 'higher_is_better',
    description: 'Volume or percentage of water recycled/reused',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Water recycled' },
      { standard: 'ESRS', paramNamePattern: 'Water recycled' },
      { standard: 'GRI', paramNamePattern: 'Water recycled' },
    ],
  },
  // ── Environment: Waste ──
  {
    canonicalName: 'Total Waste Generated',
    pillar: 'E', category: 'Waste', unitFamily: 'mass', direction: 'lower_is_better',
    description: 'Total waste generated across all categories',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Total waste' },
      { standard: 'ESRS', paramNamePattern: 'Total waste' },
      { standard: 'GRI', paramNamePattern: 'Total waste' },
    ],
  },
  {
    canonicalName: 'Waste Diverted from Disposal',
    pillar: 'E', category: 'Waste', unitFamily: 'ratio', direction: 'higher_is_better',
    description: 'Percentage of waste diverted from landfill through recycling/recovery',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Waste recycled' },
      { standard: 'ESRS', paramNamePattern: 'Waste diverted' },
      { standard: 'GRI', paramNamePattern: 'Waste diverted' },
    ],
  },
  // ── Social: Workforce ──
  {
    canonicalName: 'Total Employees',
    pillar: 'S', category: 'Workforce', unitFamily: 'count', direction: 'higher_is_better',
    description: 'Total number of employees',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Total employees (permanent)' },
      { standard: 'ESRS', paramNamePattern: 'Total employees' },
      { standard: 'GRI', paramNamePattern: 'Total employees' },
    ],
  },
  {
    canonicalName: 'Female Employees Ratio',
    pillar: 'S', category: 'Workforce', unitFamily: 'ratio', direction: 'higher_is_better',
    description: 'Percentage of female employees',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Female employees' },
      { standard: 'ESRS', paramNamePattern: 'Female employees' },
      { standard: 'GRI', paramNamePattern: 'Female employees' },
    ],
  },
  {
    canonicalName: 'Employee Turnover Rate',
    pillar: 'S', category: 'Workforce', unitFamily: 'ratio', direction: 'lower_is_better',
    description: 'Annual employee turnover rate',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Attrition rate' },
      { standard: 'ESRS', paramNamePattern: 'Turnover rate' },
      { standard: 'GRI', paramNamePattern: 'Employee turnover' },
    ],
  },
  {
    canonicalName: 'Training Hours per Employee',
    pillar: 'S', category: 'Workforce', unitFamily: 'hours', direction: 'higher_is_better',
    description: 'Average training hours per employee per year',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Training hours per employee' },
      { standard: 'ESRS', paramNamePattern: 'Training hours per employee' },
      { standard: 'GRI', paramNamePattern: 'Training hours per employee' },
    ],
  },
  // ── Social: Health & Safety ──
  {
    canonicalName: 'Lost-Time Injury Frequency Rate',
    pillar: 'S', category: 'Health & Safety', unitFamily: 'rate', direction: 'lower_is_better',
    description: 'Number of lost-time injuries per million hours worked',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'LTIFR' },
      { standard: 'ESRS', paramNamePattern: 'LTIFR' },
      { standard: 'GRI', paramNamePattern: 'LTIFR' },
    ],
  },
  {
    canonicalName: 'Work-Related Fatalities',
    pillar: 'S', category: 'Health & Safety', unitFamily: 'count', direction: 'lower_is_better',
    description: 'Number of work-related fatalities',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Fatalities' },
      { standard: 'ESRS', paramNamePattern: 'Fatalities' },
      { standard: 'GRI', paramNamePattern: 'Fatalities' },
    ],
  },
  // ── Governance ──
  {
    canonicalName: 'Board Gender Diversity',
    pillar: 'G', category: 'Governance', unitFamily: 'ratio', direction: 'higher_is_better',
    description: 'Percentage of female board members',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Women on board' },
      { standard: 'ESRS', paramNamePattern: 'Female board' },
      { standard: 'GRI', paramNamePattern: 'Female board' },
    ],
  },
  {
    canonicalName: 'Board Independence',
    pillar: 'G', category: 'Governance', unitFamily: 'ratio', direction: 'higher_is_better',
    description: 'Percentage of independent directors on the board',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Independent directors' },
      { standard: 'ESRS', paramNamePattern: 'Independent directors' },
      { standard: 'GRI', paramNamePattern: 'Independent directors' },
    ],
  },
  {
    canonicalName: 'Ethics Violations Reported',
    pillar: 'G', category: 'Ethics', unitFamily: 'count', direction: 'lower_is_better',
    description: 'Number of ethics violations or concerns reported',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Complaints on anti-competition' },
      { standard: 'ESRS', paramNamePattern: 'Ethics violations' },
      { standard: 'GRI', paramNamePattern: 'Ethics violations' },
    ],
  },
  {
    canonicalName: 'Gender Pay Gap',
    pillar: 'S', category: 'Workforce', unitFamily: 'ratio', direction: 'lower_is_better',
    description: 'Ratio or gap in pay between genders',
    paramMatches: [
      { standard: 'BRSR', paramNamePattern: 'Gender pay gap' },
      { standard: 'ESRS', paramNamePattern: 'Gender pay gap' },
      { standard: 'GRI', paramNamePattern: 'Gender pay gap' },
    ],
  },
];

// ── Upsert canonical metrics and link parameters ────────────────

async function upsertCanonicalMetrics(): Promise<{ metricsInserted: number; metricsUpdated: number; linksCreated: number }> {
  let metricsInserted = 0;
  let metricsUpdated = 0;
  let linksCreated = 0;

  for (const def of CANONICAL_DEFS) {
    // Check if canonical metric already exists by name
    const existing = await db
      .select({ canonicalId: canonicalMetrics.canonicalId })
      .from(canonicalMetrics)
      .where(eq(canonicalMetrics.canonicalName, def.canonicalName))
      .limit(1);

    let resolvedCanonicalId: string;

    if (existing.length > 0) {
      // Update existing
      resolvedCanonicalId = existing[0].canonicalId;
      await db
        .update(canonicalMetrics)
        .set({
          pillar: def.pillar,
          category: def.category,
          unitFamily: def.unitFamily,
          direction: def.direction,
          description: def.description,
        })
        .where(eq(canonicalMetrics.canonicalId, resolvedCanonicalId));
      metricsUpdated++;
    } else {
      // Insert new
      resolvedCanonicalId = randomUUID();
      await db.insert(canonicalMetrics).values({
        canonicalId: resolvedCanonicalId,
        canonicalName: def.canonicalName,
        pillar: def.pillar,
        category: def.category,
        unitFamily: def.unitFamily,
        direction: def.direction,
        description: def.description,
      });
      metricsInserted++;
    }

    // Link matching kpi_parameters to this canonical metric (only if not already linked)
    for (const match of def.paramMatches) {
      const updated = await db
        .update(kpiParameters)
        .set({ canonicalId: resolvedCanonicalId })
        .where(
          and(
            eq(kpiParameters.standard, match.standard),
            isNull(kpiParameters.tenantId),
            isNull(kpiParameters.canonicalId),
            sql`${kpiParameters.name} ILIKE ${match.paramNamePattern + '%'}`,
          )
        )
        .returning({ paramId: kpiParameters.paramId });

      linksCreated += updated.length;
    }
  }

  return { metricsInserted, metricsUpdated, linksCreated };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding canonical metrics and creating cross-standard links...');
  console.log(`  Canonical metric definitions: ${CANONICAL_DEFS.length}`);

  const { metricsInserted, metricsUpdated, linksCreated } = await upsertCanonicalMetrics();

  console.log('\nCanonical metrics seed complete:');
  console.log(`  Metrics inserted: ${metricsInserted}`);
  console.log(`  Metrics updated:  ${metricsUpdated}`);
  console.log(`  Parameter links:  ${linksCreated}`);
}

main()
  .catch((err) => {
    console.error('Seed canonical metrics failed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
