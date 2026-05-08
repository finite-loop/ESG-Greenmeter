import type { Job } from 'pg-boss';
import type { JobResult, JobProgress } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { download } from '@/lib/blobStorage';
import { extractText } from '@/lib/documentIntelligence';
import { createLlmClient } from '@/lib/llm';
import { db, setTenantContext } from '@/db';
import { documents, rawExtractions, extractedMetrics } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getExtractionPrompt, isSupportedStandard } from './extractionPrompts';
import type { SupportedStandard } from './extractionPrompts';

export interface ExtractionJobData {
  documentId: string;
  tenantId: string;
}

export interface ExtractionJobResult {
  extractionId: string;
  metricsFound: number;
}

/**
 * Maximum number of metric rows to insert in a single batch.
 * PostgreSQL has a ~65535 parameter limit; each metric row has ~11 columns,
 * so 500 rows * 11 cols = 5500 params, well within limits.
 */
const METRIC_INSERT_BATCH_SIZE = 500;

/**
 * Pipeline stages for progress reporting.
 */
const STAGES = {
  initializing: { progress: 0, message: 'Starting extraction pipeline' },
  downloading: { progress: 10, message: 'Downloading PDF from storage' },
  ocr: { progress: 25, message: 'Running OCR via Document Intelligence' },
  llm: { progress: 50, message: 'Extracting metrics via LLM' },
  parsing: { progress: 75, message: 'Parsing extracted metrics' },
  complete: { progress: 100, message: 'Extraction complete' },
} as const;

type StageName = keyof typeof STAGES;

async function updateProgress(jobId: string, stage: StageName): Promise<void> {
  try {
    const stageInfo = STAGES[stage];
    const progress: JobProgress = {
      stage,
      progress: stageInfo.progress,
      message: stageInfo.message,
    };
    await reportProgress('extraction-pipeline', jobId, progress);
  } catch (err) {
    logger.warn('Failed to report job progress (non-fatal)', {
      jobId,
      stage,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Parses a raw string value into a numeric value.
 * Handles Indian number formatting ("1,60,000" → 160000),
 * standard formatting ("1,000.50" → 1000.5),
 * and special values ("NIL", "NA", "N/A", "-" → null).
 */
export function parseNumericValue(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;

  const trimmed = raw.trim();
  if (trimmed === '') return null;

  // Check for non-numeric sentinel values
  const upper = trimmed.toUpperCase();
  const nonNumeric = ['NIL', 'NA', 'N/A', 'NOT APPLICABLE', 'NOT REPORTED', '-', '--', 'YES', 'NO', 'TRUE', 'FALSE'];
  if (nonNumeric.includes(upper)) return null;

  // Remove currency symbols and whitespace
  let cleaned = trimmed.replace(/[₹$€£¥,\s]/g, '');

  // Handle percentage sign
  cleaned = cleaned.replace(/%$/, '');

  // Handle parentheses for negative numbers: (123) → -123
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  // Try to parse as a number
  const num = Number(cleaned);
  if (Number.isFinite(num)) {
    return num.toString();
  }

  return null;
}

/**
 * Extracts the JSON payload from an LLM response.
 * The LLM may wrap its output in markdown code fences or xml tags.
 */
export function extractJsonFromResponse(response: string): unknown {
  let text = response.trim();

  // Strip <json_output>...</json_output> wrapper
  const xmlMatch = text.match(/<json_output>\s*([\s\S]*?)\s*<\/json_output>/i);
  if (xmlMatch) {
    text = xmlMatch[1].trim();
  }

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  return JSON.parse(text);
}

/**
 * Represents a single metric extracted from the LLM JSON, normalized
 * across all standard formats.
 */
interface NormalizedMetric {
  section: string | null;
  topic: string | null;
  metricName: string;
  metricValue: string | null;
  unit: string | null;
  indicatorType: string | null;
  additionalContext: string | null;
}

/**
 * Normalized document info extracted from the LLM JSON.
 */
interface DocumentInfo {
  companyName: string;
  sector: string | null;
  country: string | null;
  currency: string | null;
  reportingPeriod: string | null;
  fiscalYear: string | null;
}

function safeStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/**
 * Parses the document_info block common to all standards.
 */
function parseDocumentInfo(payload: Record<string, unknown>): DocumentInfo {
  const info = (payload.document_info ?? {}) as Record<string, unknown>;
  return {
    companyName: safeStr(info.company_name) ?? 'Unknown',
    sector: safeStr(info.sector),
    country: safeStr(info.country),
    currency: safeStr(info.currency),
    reportingPeriod: safeStr(info.reporting_period),
    fiscalYear: safeStr(info.fiscal_year),
  };
}

/**
 * Parses BRSR-format JSON into normalized metrics.
 */
function parseBrsrMetrics(payload: Record<string, unknown>): NormalizedMetric[] {
  const metrics: NormalizedMetric[] = [];
  const principles = payload.principles;
  if (!Array.isArray(principles)) return metrics;

  for (const principle of principles) {
    const p = principle as Record<string, unknown>;
    const section = safeStr(p.principle_number);
    const topic = safeStr(p.principle_name);

    for (const indicatorType of ['essential_indicators', 'leadership_indicators'] as const) {
      const indicators = p[indicatorType];
      if (!Array.isArray(indicators)) continue;

      const typeLabel = indicatorType === 'essential_indicators' ? 'essential' : 'leadership';

      for (const indicator of indicators) {
        const ind = indicator as Record<string, unknown>;
        const metricName = safeStr(ind.metric_name);
        if (!metricName) continue;

        metrics.push({
          section,
          topic,
          metricName,
          metricValue: safeStr(ind.metric_value),
          unit: safeStr(ind.unit),
          indicatorType: typeLabel,
          additionalContext: safeStr(ind.additional_context),
        });
      }
    }
  }

  return metrics;
}

/**
 * Parses ESRS-format JSON into normalized metrics.
 */
function parseEsrsMetrics(payload: Record<string, unknown>): NormalizedMetric[] {
  const metrics: NormalizedMetric[] = [];
  const standards = payload.standards;
  if (!Array.isArray(standards)) return metrics;

  for (const standard of standards) {
    const s = standard as Record<string, unknown>;
    const section = safeStr(s.standard_code);
    const sectionName = safeStr(s.standard_name);

    const standardMetrics = s.metrics;
    if (!Array.isArray(standardMetrics)) continue;

    for (const metric of standardMetrics) {
      const m = metric as Record<string, unknown>;
      const metricName = safeStr(m.metric_name);
      if (!metricName) continue;

      metrics.push({
        section,
        topic: safeStr(m.topic) ?? sectionName,
        metricName,
        metricValue: safeStr(m.metric_value),
        unit: safeStr(m.unit),
        indicatorType: 'mandatory',
        additionalContext: safeStr(m.additional_context),
      });
    }
  }

  return metrics;
}

/**
 * Parses GRI-format JSON into normalized metrics.
 */
function parseGriMetrics(payload: Record<string, unknown>): NormalizedMetric[] {
  const metrics: NormalizedMetric[] = [];
  const griStandards = payload.gri_standards;
  if (!Array.isArray(griStandards)) return metrics;

  for (const griStandard of griStandards) {
    const g = griStandard as Record<string, unknown>;
    const section = safeStr(g.gri_series);
    const sectionName = safeStr(g.series_name);

    const disclosures = g.disclosures;
    if (!Array.isArray(disclosures)) continue;

    for (const disclosure of disclosures) {
      const d = disclosure as Record<string, unknown>;
      const metricName = safeStr(d.metric_name);
      if (!metricName) continue;

      metrics.push({
        section,
        topic: safeStr(d.disclosure_title) ?? sectionName,
        metricName,
        metricValue: safeStr(d.metric_value),
        unit: safeStr(d.unit),
        indicatorType: null,
        additionalContext: safeStr(d.additional_context),
      });
    }
  }

  return metrics;
}

/**
 * Parses LLM JSON output into normalized metrics based on the standard.
 */
export function parseLlmOutput(
  payload: Record<string, unknown>,
  standard: SupportedStandard
): { documentInfo: DocumentInfo; metrics: NormalizedMetric[] } {
  const documentInfo = parseDocumentInfo(payload);

  let metrics: NormalizedMetric[];
  switch (standard) {
    case 'BRSR':
      metrics = parseBrsrMetrics(payload);
      break;
    case 'ESRS':
      metrics = parseEsrsMetrics(payload);
      break;
    case 'GRI':
      metrics = parseGriMetrics(payload);
      break;
  }

  return { documentInfo, metrics };
}

/**
 * Processes a single extraction job through the full pipeline:
 *   1. Download PDF from Blob Storage
 *   2. OCR via Document Intelligence
 *   3. LLM extraction with standard-specific prompt
 *   4. Parse JSON and insert raw_extractions + extracted_metrics
 */
async function processExtractionJob(
  job: Job<ExtractionJobData>
): Promise<ExtractionJobResult> {
  const { documentId, tenantId } = job.data;

  // Set tenant context for RLS
  await setTenantContext(tenantId);

  // 1. Look up the document record
  const docRows = await db
    .select()
    .from(documents)
    .where(eq(documents.docId, documentId))
    .limit(1);

  const doc = docRows[0];
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (!isSupportedStandard(doc.standard)) {
    throw new Error(`Unsupported standard: ${doc.standard}`);
  }

  const standard = doc.standard as SupportedStandard;

  // Look up peer company name
  const peerRows = await db
    .select({ name: peerOrganisations.name, sector: peerOrganisations.sector, country: peerOrganisations.country })
    .from(peerOrganisations)
    .where(eq(peerOrganisations.peerId, doc.peerId))
    .limit(1);

  const peer = peerRows[0];

  // 2. Download PDF
  await updateProgress(job.id, 'downloading');
  logger.info('Downloading PDF from blob storage', { documentId, blobPath: doc.blobPath });

  const pdfBuffer = await download(tenantId, doc.blobPath);

  // 3. OCR
  await updateProgress(job.id, 'ocr');
  logger.info('Running OCR via Document Intelligence', { documentId });

  const ocrResult = await extractText(pdfBuffer);

  if (!ocrResult.fullText || ocrResult.fullText.trim().length === 0) {
    throw new Error('OCR produced no text from the document');
  }

  logger.info('OCR complete', {
    documentId,
    textLength: ocrResult.fullText.length,
    pageCount: ocrResult.pages.length,
  });

  // 4. LLM extraction
  await updateProgress(job.id, 'llm');
  logger.info('Calling LLM for metric extraction', { documentId, standard });

  const llmClient = createLlmClient();
  const systemPrompt = getExtractionPrompt(standard);
  const llmResponse = await llmClient.complete(systemPrompt, ocrResult.fullText, {
    temperature: 0.1,
    maxTokens: 16384,
  });

  // 5. Parse JSON response
  await updateProgress(job.id, 'parsing');
  logger.info('Parsing LLM response', { documentId });

  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = extractJsonFromResponse(llmResponse) as Record<string, unknown>;
  } catch {
    throw new Error(`Failed to parse LLM JSON response: invalid JSON`);
  }

  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    throw new Error('LLM response is not a valid JSON object');
  }

  const { documentInfo, metrics } = parseLlmOutput(rawPayload, standard);

  // Use peer info as fallback for document info
  const companyName = documentInfo.companyName !== 'Unknown'
    ? documentInfo.companyName
    : (peer?.name ?? 'Unknown');

  // 6. Insert raw_extractions + extracted_metrics + update document in a transaction
  const extractionId = await db.transaction(async (tx) => {
    const extractionRows = await tx
      .insert(rawExtractions)
      .values({
        tenantId,
        docId: documentId,
        standard,
        companyName,
        sector: documentInfo.sector ?? peer?.sector ?? null,
        country: documentInfo.country ?? peer?.country ?? null,
        currency: documentInfo.currency,
        reportingPeriod: documentInfo.reportingPeriod,
        fiscalYear: documentInfo.fiscalYear ?? doc.fiscalYear,
        rawPayload,
        extractionModel: process.env.LLM_MODEL ?? null,
        extractionPrompt: `${standard}_v1`,
        status: 'pending_mapping',
        metricCount: metrics.length,
        mappedCount: 0,
      })
      .returning({ extractionId: rawExtractions.extractionId });

    if (!extractionRows[0]) {
      throw new Error('Failed to create raw extraction record: no rows returned');
    }

    const extId = extractionRows[0].extractionId;

    logger.info('Raw extraction record created', {
      documentId,
      extractionId: extId,
      metricCount: metrics.length,
    });

    // Insert extracted_metrics rows in batches
    if (metrics.length > 0) {
      const metricRows = metrics.map((m) => ({
        extractionId: extId,
        tenantId,
        standard,
        section: m.section,
        topic: m.topic,
        metricName: m.metricName,
        metricValue: m.metricValue,
        parsedValue: parseNumericValue(m.metricValue),
        unit: m.unit,
        indicatorType: m.indicatorType,
        additionalContext: m.additionalContext,
      }));

      for (let i = 0; i < metricRows.length; i += METRIC_INSERT_BATCH_SIZE) {
        const batch = metricRows.slice(i, i + METRIC_INSERT_BATCH_SIZE);
        await tx.insert(extractedMetrics).values(batch);
      }

      logger.info('Extracted metrics inserted', {
        documentId,
        extractionId: extId,
        count: metricRows.length,
      });
    }

    // Update document status to completed
    await tx
      .update(documents)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(documents.docId, documentId));

    return extId;
  });

  await updateProgress(job.id, 'complete');

  return { extractionId, metricsFound: metrics.length };
}

/**
 * pg-boss handler for the extraction-pipeline queue.
 * Processes each job sequentially through the full pipeline.
 */
export async function handleExtractionPipeline(
  jobs: Job<ExtractionJobData>[]
): Promise<JobResult<ExtractionJobResult>[]> {
  const results: JobResult<ExtractionJobResult>[] = [];

  for (const job of jobs) {
    const { documentId, tenantId } = job.data;

    try {
      await updateProgress(job.id, 'initializing');

      const result = await processExtractionJob(job);

      logger.info('Extraction pipeline completed successfully', {
        documentId,
        extractionId: result.extractionId,
        metricsFound: result.metricsFound,
      });

      results.push({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Extraction pipeline failed', {
        documentId,
        tenantId,
        jobId: job.id,
        error: message,
      });

      // Update document status to failed — re-establish tenant context
      // since it may not have been set if the failure occurred early.
      try {
        await setTenantContext(tenantId);
        await db
          .update(documents)
          .set({
            status: 'failed',
            errorMessage: message,
            updatedAt: new Date(),
          })
          .where(eq(documents.docId, documentId));
      } catch (updateErr) {
        logger.error('Failed to update document status after pipeline failure', {
          documentId,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }

      results.push({ success: false, error: message });
    }
  }

  return results;
}
