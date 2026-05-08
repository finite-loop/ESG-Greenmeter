import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { kpiParameters } from '../src/db/schema/kpi';
import { eq, and, isNull } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  inferPillarBRSR,
  inferPillarESRS,
  inferPillarGRI,
  inferDataType,
  inferDirection,
  inferCategoryBRSR,
  generateCode,
  inferIndicatorType,
  cellStr,
  isSectionHeader,
} from './seed-inference';

const SEED_DIR = path.resolve(__dirname, '../../seed_data');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ── Excel parsing ───────────────────────────────────────────────

interface SeedParameter {
  paramId: string;
  standard: string;
  standardSection: string;
  standardCode: string | null;
  disclosure: string | null;
  code: string;
  name: string;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  indicatorType: string | null;
  computationMethod: string | null;
  direction: string;
}

async function parseBRSR(): Promise<SeedParameter[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(SEED_DIR, 'BRSR_Seed_Data.xlsx'));
  const ws = wb.getWorksheet('Infosys');
  if (!ws) throw new Error('BRSR: Infosys sheet not found');

  const params: SeedParameter[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return; // skip header rows

    const section = cellStr(row.getCell(1).value);
    const disclosure = cellStr(row.getCell(2).value);
    const parameter = cellStr(row.getCell(3).value);
    const unit = cellStr(row.getCell(4).value);
    const computation = cellStr(row.getCell(5).value);

    if (!parameter || isSectionHeader(section)) return;

    const key = `BRSR:${section}:${parameter}`;
    if (seen.has(key)) return;
    seen.add(key);

    const pillar = inferPillarBRSR(section);
    const code = generateCode('BRSR', pillar, parameter);

    params.push({
      paramId: randomUUID(),
      standard: 'BRSR',
      standardSection: section,
      standardCode: null,
      disclosure,
      code,
      name: parameter,
      pillar,
      unit: unit || 'No.',
      dataType: inferDataType(unit || 'No.'),
      category: inferCategoryBRSR(section, disclosure),
      indicatorType: inferIndicatorType(section, 'BRSR'),
      computationMethod: computation || null,
      direction: inferDirection(parameter, unit),
    });
  });

  return params;
}

async function parseESRS(): Promise<SeedParameter[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(SEED_DIR, 'ESRS_Seed_Data.xlsx'));
  const ws = wb.getWorksheet('Siemens');
  if (!ws) throw new Error('ESRS: Siemens sheet not found');

  const params: SeedParameter[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const esrsStd = cellStr(row.getCell(1).value);
    const topic = cellStr(row.getCell(2).value);
    const subTopic = cellStr(row.getCell(3).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);
    const computation = cellStr(row.getCell(6).value);

    if (!parameter || isSectionHeader(esrsStd)) return;

    const key = `ESRS:${esrsStd}:${parameter}`;
    if (seen.has(key)) return;
    seen.add(key);

    const pillar = inferPillarESRS(esrsStd);
    const code = generateCode('ESRS', pillar, parameter);

    params.push({
      paramId: randomUUID(),
      standard: 'ESRS',
      standardSection: esrsStd,
      standardCode: null,
      disclosure: subTopic || null,
      code,
      name: parameter,
      pillar,
      unit: unit || 'No.',
      dataType: inferDataType(unit || 'No.'),
      category: topic || null,
      indicatorType: inferIndicatorType(esrsStd, 'ESRS'),
      computationMethod: computation || null,
      direction: inferDirection(parameter, unit),
    });
  });

  return params;
}

async function parseGRI(): Promise<SeedParameter[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(SEED_DIR, 'GRI_Seed_Data.xlsx'));
  const ws = wb.getWorksheet('Givaudan');
  if (!ws) throw new Error('GRI: Givaudan sheet not found');

  const params: SeedParameter[] = [];
  const seen = new Set<string>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;

    const griSeries = cellStr(row.getCell(1).value);
    const griCode = cellStr(row.getCell(2).value);
    const disclosureTitle = cellStr(row.getCell(3).value);
    const parameter = cellStr(row.getCell(4).value);
    const unit = cellStr(row.getCell(5).value);
    const computation = cellStr(row.getCell(6).value);

    if (!parameter || isSectionHeader(griSeries)) return;

    const key = `GRI:${griSeries}:${parameter}`;
    if (seen.has(key)) return;
    seen.add(key);

    const pillar = inferPillarGRI(griSeries);
    const code = generateCode('GRI', pillar, parameter);

    params.push({
      paramId: randomUUID(),
      standard: 'GRI',
      standardSection: griSeries,
      standardCode: griCode || null,
      disclosure: disclosureTitle || null,
      code,
      name: parameter,
      pillar,
      unit: unit || 'No.',
      dataType: inferDataType(unit || 'No.'),
      category: disclosureTitle || null,
      indicatorType: inferIndicatorType(griSeries, 'GRI'),
      computationMethod: computation || null,
      direction: inferDirection(parameter, unit),
    });
  });

  return params;
}

// ── Upsert into database ───────────────────────────────────────

async function upsertParameters(params: SeedParameter[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  await db.transaction(async (tx) => {
    for (const p of params) {
      // Check if parameter already exists (NULL tenant_id requires IS NULL check)
      const existing = await tx
        .select({ paramId: kpiParameters.paramId })
        .from(kpiParameters)
        .where(
          and(
            isNull(kpiParameters.tenantId),
            eq(kpiParameters.standard, p.standard),
            eq(kpiParameters.code, p.code),
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing parameter
        await tx
          .update(kpiParameters)
          .set({
            standardSection: p.standardSection,
            standardCode: p.standardCode,
            disclosure: p.disclosure,
            name: p.name,
            pillar: p.pillar,
            unit: p.unit,
            dataType: p.dataType,
            category: p.category,
            indicatorType: p.indicatorType,
            computationMethod: p.computationMethod,
            direction: p.direction,
          })
          .where(eq(kpiParameters.paramId, existing[0].paramId));
        updated++;
      } else {
        // Insert new parameter
        await tx.insert(kpiParameters).values({
          paramId: p.paramId,
          tenantId: null,
          standard: p.standard,
          standardSection: p.standardSection,
          standardCode: p.standardCode,
          disclosure: p.disclosure,
          code: p.code,
          name: p.name,
          pillar: p.pillar,
          unit: p.unit,
          dataType: p.dataType,
          category: p.category,
          indicatorType: p.indicatorType,
          computationMethod: p.computationMethod,
          direction: p.direction,
          rollupMethod: 'SUM',
          status: 'active',
          src: 'system',
          priorityOrder: 999,
        });
        inserted++;
      }
    }
  });

  return { inserted, updated };
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('Parsing seed data from Excel files...');

  const [brsr, esrs, gri] = await Promise.all([
    parseBRSR(),
    parseESRS(),
    parseGRI(),
  ]);

  console.log(`  BRSR: ${brsr.length} parameters parsed`);
  console.log(`  ESRS: ${esrs.length} parameters parsed`);
  console.log(`  GRI:  ${gri.length} parameters parsed`);
  console.log(`  Total: ${brsr.length + esrs.length + gri.length} parameters`);

  console.log('\nUpserting parameters into kpi_parameters...');

  const allParams = [...brsr, ...esrs, ...gri];
  const { inserted, updated } = await upsertParameters(allParams);

  console.log(`\nSeed complete:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Total:    ${inserted + updated}`);
}

main()
  .catch((err) => {
    console.error('Seed parameters failed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
