import type { Job } from 'pg-boss';
import type { JobResult, JobProgress } from '@/lib/pgBoss';
import { reportProgress } from '@/lib/pgBoss';
import { db, setTenantContext } from '@/db';
import { kpiValues } from '@/db/schema/kpi';
import { configRepository } from '@/db/repositories/configRepository';
import { kpiRepository } from '@/db/repositories/kpiRepository';
import { parameterRepository } from '@/db/repositories/parameterRepository';
import { auditService } from '@/services/auditService';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { submitJob } from '@/jobs';
import type { ScoreRecomputeJobData } from '@/jobs/scoreRecompute';
import type { IntegrationConfigValue, IntegrationType } from '@/schemas/integration';
import { eq, and, sql } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSyncJobData {
  tenantId: string;
  integrationType: IntegrationType;
}

export interface ApiSyncJobResult {
  recordsSynced: number;
  errorsCount: number;
  syncedAt: string;
}

/** A single metric fetched from an external system. */
export interface ExternalMetric {
  externalFieldName: string;
  value: string;
  unit?: string;
}

/** Maps an external field name to an internal parameter code. */
export interface FieldMapping {
  externalField: string;
  paramCode: string;
}

/** Configuration stored in tenant_config JSONB for API integrations with field mappings. */
export interface ApiSyncConfig extends IntegrationConfigValue {
  fieldMappings?: FieldMapping[];
}

// ─── Progress Stages ──────────────────────────────────────────────────────────

const STAGES = {
  initializing: { progress: 0, message: 'Starting API sync' },
  loading_config: { progress: 10, message: 'Loading integration configuration' },
  connecting: { progress: 25, message: 'Connecting to external system' },
  fetching: { progress: 40, message: 'Fetching data from external system' },
  mapping: { progress: 60, message: 'Mapping external fields to parameters' },
  upserting: { progress: 75, message: 'Upserting KPI values' },
  auditing: { progress: 90, message: 'Recording audit logs' },
  complete: { progress: 100, message: 'API sync complete' },
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
    await reportProgress('api-sync', jobId, progress);
  } catch (err) {
    logger.warn('Failed to report api-sync job progress (non-fatal)', {
      jobId,
      stage,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Value Coercion ──────────────────────────────────────────────────────────

/**
 * Safely coerce a raw API value to a string.
 * Only accepts strings and finite numbers — rejects objects, arrays, booleans,
 * NaN, and other non-primitive types that would produce meaningless strings
 * like "[object Object]" or "false".
 */
function coerceMetricValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
}

// ─── Connector Interface ──────────────────────────────────────────────────────

/**
 * All external system connectors implement this interface.
 * Each connector knows how to authenticate and fetch metrics from a specific system.
 */
export interface ExternalConnector {
  /** Fetch metrics from the external system. */
  fetchMetrics(endpoint: string, authKey: string): Promise<ExternalMetric[]>;
}

// ─── SAP Connector ────────────────────────────────────────────────────────────

/**
 * SAP ERP connector.
 * Fetches ESG-related metrics from a SAP API endpoint.
 * Expected response format: { d: { results: [{ FieldName: string, Value: string, Unit?: string }] } }
 */
export const sapConnector: ExternalConnector = {
  async fetchMetrics(endpoint: string, authKey: string): Promise<ExternalMetric[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SAP API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const body = await response.json() as Record<string, unknown>;

      // SAP OData format: { d: { results: [...] } }
      const d = body.d as Record<string, unknown> | undefined;
      const results = (d?.results ?? body.results ?? body.value) as
        Array<Record<string, unknown>> | undefined;

      if (!Array.isArray(results)) {
        throw new Error('SAP response does not contain a results array');
      }

      return results.map((row) => ({
        externalFieldName: coerceMetricValue(row.FieldName ?? row.field_name ?? row.MetricId),
        value: coerceMetricValue(row.Value ?? row.value),
        unit: row.Unit != null ? String(row.Unit) : (row.unit != null ? String(row.unit) : undefined),
      })).filter((m) => m.externalFieldName !== '' && m.value !== '');
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('SAP API request timed out after 30 seconds');
      }

      throw err;
    }
  },
};

// ─── Darwinbox Connector ──────────────────────────────────────────────────────

/**
 * Darwinbox HRMS connector.
 * Fetches HR-related ESG metrics: headcount, LTIFR, training hours, etc.
 * Expected response format: { data: [{ metric_id: string, metric_value: string, unit?: string }] }
 */
export const darwinboxConnector: ExternalConnector = {
  async fetchMetrics(endpoint: string, authKey: string): Promise<ExternalMetric[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Darwinbox API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const body = await response.json() as Record<string, unknown>;

      const data = (body.data ?? body.metrics ?? body.results) as
        Array<Record<string, unknown>> | undefined;

      if (!Array.isArray(data)) {
        throw new Error('Darwinbox response does not contain a data array');
      }

      return data.map((row) => ({
        externalFieldName: coerceMetricValue(row.metric_id ?? row.metricId ?? row.field_name),
        value: coerceMetricValue(row.metric_value ?? row.metricValue ?? row.value),
        unit: row.unit != null ? String(row.unit) : undefined,
      })).filter((m) => m.externalFieldName !== '' && m.value !== '');
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Darwinbox API request timed out after 30 seconds');
      }

      throw err;
    }
  },
};

// ─── Connector Registry ───────────────────────────────────────────────────────

const CONNECTORS: Record<string, ExternalConnector> = {
  sap: sapConnector,
  darwinbox: darwinboxConnector,
};

/**
 * Get the appropriate connector for an integration type.
 * Throws if the integration type has no connector implementation.
 */
export function getConnector(integrationType: string): ExternalConnector {
  const connector = CONNECTORS[integrationType];
  if (!connector) {
    throw new Error(`No connector implementation for integration type: ${integrationType}`);
  }
  return connector;
}

// ─── Mapping Logic ────────────────────────────────────────────────────────────

interface MappedMetric {
  paramId: string;
  value: string;
  unit: string | undefined;
  externalFieldName: string;
}

/**
 * Maps external metrics to internal parameter IDs using the field mappings
 * configured in the integration config.
 *
 * Strategy:
 * 1. If fieldMappings exist in config, use explicit mapping (externalField → paramCode)
 * 2. Otherwise, try to match externalFieldName directly as paramCode (case-insensitive)
 */
export async function mapMetricsToParams(
  tenantId: string,
  metrics: ExternalMetric[],
  fieldMappings: FieldMapping[] | undefined
): Promise<{ mapped: MappedMetric[]; unmapped: string[] }> {
  // Load all parameters for this tenant
  const params = await parameterRepository.findAllForMatching(tenantId);
  const paramByCode = new Map<string, string>(); // code (lowercase) → paramId
  for (const p of params) {
    paramByCode.set(p.code.toLowerCase(), p.paramId);
  }

  // Build explicit mapping lookup if available
  const explicitMap = new Map<string, string>(); // externalField (lowercase) → paramCode (lowercase)
  if (fieldMappings && fieldMappings.length > 0) {
    for (const fm of fieldMappings) {
      explicitMap.set(fm.externalField.toLowerCase(), fm.paramCode.toLowerCase());
    }
  }

  const mapped: MappedMetric[] = [];
  const unmapped: string[] = [];

  for (const metric of metrics) {
    const externalKey = metric.externalFieldName.toLowerCase();

    // Strategy 1: explicit mapping
    let paramCode: string | undefined;
    if (explicitMap.size > 0) {
      paramCode = explicitMap.get(externalKey);
    }

    // Strategy 2: direct match by external field name as param code
    if (!paramCode) {
      paramCode = externalKey;
    }

    const paramId = paramByCode.get(paramCode);
    if (paramId) {
      mapped.push({
        paramId,
        value: metric.value,
        unit: metric.unit,
        externalFieldName: metric.externalFieldName,
      });
    } else {
      unmapped.push(metric.externalFieldName);
    }
  }

  return { mapped, unmapped };
}

// ─── Core Sync Logic ──────────────────────────────────────────────────────────

/**
 * Processes a single API sync job:
 *   1. Load integration config for the tenant
 *   2. Connect to external system using stored credentials
 *   3. Fetch data and map external fields to internal param_ids
 *   4. Upsert kpi_values with source_type='api'
 *   5. Audit log each upserted value
 */
async function processApiSyncJob(
  job: Job<ApiSyncJobData>
): Promise<ApiSyncJobResult> {
  const { tenantId, integrationType } = job.data;
  const batchId = job.id;
  const timestamp = new Date().toISOString();
  const sourceRef = `${integrationType}:${batchId}:${timestamp}`;

  // Set tenant context for RLS
  await setTenantContext(tenantId);

  // 1. Load integration config
  await updateProgress(job.id, 'loading_config');
  const configRow = await configRepository.getIntegrationConfig(tenantId, integrationType);
  if (!configRow) {
    throw new Error(`No integration config found for type '${integrationType}' in tenant ${tenantId}`);
  }

  const config = configRow.value as ApiSyncConfig;
  if (!config.enabled) {
    logger.info('Integration is disabled, skipping sync', { tenantId, integrationType });
    return { recordsSynced: 0, errorsCount: 0, syncedAt: timestamp };
  }

  // Decrypt credentials
  let authKey: string;
  try {
    authKey = decrypt(config.credentialEncrypted);
  } catch (err) {
    throw new Error(`Failed to decrypt credentials for ${integrationType}: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Connect and fetch
  await updateProgress(job.id, 'connecting');
  const connector = getConnector(integrationType);

  await updateProgress(job.id, 'fetching');
  const externalMetrics = await connector.fetchMetrics(config.endpoint, authKey);

  logger.info('Fetched metrics from external system', {
    tenantId,
    integrationType,
    metricCount: externalMetrics.length,
  });

  if (externalMetrics.length === 0) {
    logger.info('No metrics returned from external system', { tenantId, integrationType });
    return { recordsSynced: 0, errorsCount: 0, syncedAt: timestamp };
  }

  // 3. Map external fields to internal params
  await updateProgress(job.id, 'mapping');
  const { mapped, unmapped } = await mapMetricsToParams(
    tenantId,
    externalMetrics,
    config.fieldMappings
  );

  if (unmapped.length > 0) {
    logger.warn('Some external fields could not be mapped to parameters', {
      tenantId,
      integrationType,
      unmappedCount: unmapped.length,
      unmappedFields: unmapped.slice(0, 20), // Log first 20 to avoid huge log entries
    });
  }

  if (mapped.length === 0) {
    logger.warn('No metrics could be mapped to parameters', { tenantId, integrationType });
    return { recordsSynced: 0, errorsCount: 0, syncedAt: timestamp };
  }

  // 4. Get the root org node and active reporting period for this tenant
  const rootNodes = await db.execute<{ node_id: string }>(
    sql`SELECT node_id FROM org_nodes WHERE tenant_id = ${tenantId} AND node_type = 'company' ORDER BY created_at ASC LIMIT 1`
  );
  if (rootNodes.length === 0) {
    throw new Error(`No root org node found for tenant ${tenantId}`);
  }
  const nodeId = rootNodes[0].node_id;

  const activePeriods = await db.execute<{ period_id: string }>(
    sql`SELECT period_id FROM reporting_periods WHERE tenant_id = ${tenantId} AND status = 'open' ORDER BY end_date DESC LIMIT 1`
  );
  if (activePeriods.length === 0) {
    throw new Error(`No active reporting period found for tenant ${tenantId}`);
  }
  const periodId = activePeriods[0].period_id;

  // 5. Upsert KPI values
  await updateProgress(job.id, 'upserting');
  let recordsSynced = 0;
  let errorsCount = 0;

  for (const metric of mapped) {
    try {
      // Check for existing value
      const existing = await kpiRepository.findByParamNodePeriod(
        tenantId,
        metric.paramId,
        nodeId,
        periodId
      );

      let oldValue: Record<string, unknown> | undefined;
      let newValueRow: Record<string, unknown>;

      if (existing) {
        // Update existing value
        oldValue = {
          value: existing.value,
          unit: existing.unit,
          sourceType: existing.sourceType,
          sourceRef: existing.sourceRef,
        };

        const updateResult = await db
          .update(kpiValues)
          .set({
            value: metric.value,
            unit: metric.unit ?? existing.unit,
            sourceType: 'api',
            sourceRef: sourceRef,
            updatedAt: sql`now()`,
          })
          .where(eq(kpiValues.valueId, existing.valueId))
          .returning();

        newValueRow = {
          valueId: updateResult[0].valueId,
          value: metric.value,
          unit: metric.unit ?? existing.unit,
          sourceType: 'api',
          sourceRef: sourceRef,
        };

        // Audit log the update
        await auditService.logChange({
          userId: 'system',
          tenantId,
          action: 'UPDATE',
          entityType: 'kpi_value',
          entityId: existing.valueId,
          oldValue,
          newValue: newValueRow,
          metadata: {
            integrationType,
            externalField: metric.externalFieldName,
            jobId: batchId,
          },
        });
      } else {
        // Insert new value — with race condition handling for concurrent upserts
        try {
          const created = await kpiRepository.insert(tenantId, {
            paramId: metric.paramId,
            nodeId,
            periodId,
            value: metric.value,
            unit: metric.unit,
            sourceType: 'api',
            sourceRef: sourceRef,
          });

          newValueRow = {
            valueId: created.valueId,
            value: metric.value,
            unit: metric.unit,
            sourceType: 'api',
            sourceRef: sourceRef,
          };

          // Audit log the create
          await auditService.logChange({
            userId: 'system',
            tenantId,
            action: 'CREATE',
            entityType: 'kpi_value',
            entityId: created.valueId,
            newValue: newValueRow,
            metadata: {
              integrationType,
              externalField: metric.externalFieldName,
              jobId: batchId,
            },
          });
        } catch (insertErr: unknown) {
          // Unique constraint violation — another process inserted concurrently
          if ((insertErr as { code?: string })?.code === '23505') {
            const raceWinner = await kpiRepository.findByParamNodePeriod(
              tenantId, metric.paramId, nodeId, periodId
            );
            if (!raceWinner) throw insertErr;

            oldValue = {
              value: raceWinner.value,
              unit: raceWinner.unit,
              sourceType: raceWinner.sourceType,
              sourceRef: raceWinner.sourceRef,
            };

            const retryUpdate = await db
              .update(kpiValues)
              .set({
                value: metric.value,
                unit: metric.unit ?? raceWinner.unit,
                sourceType: 'api',
                sourceRef: sourceRef,
                updatedAt: sql`now()`,
              })
              .where(eq(kpiValues.valueId, raceWinner.valueId))
              .returning();

            newValueRow = {
              valueId: retryUpdate[0].valueId,
              value: metric.value,
              unit: metric.unit ?? raceWinner.unit,
              sourceType: 'api',
              sourceRef: sourceRef,
            };

            await auditService.logChange({
              userId: 'system',
              tenantId,
              action: 'UPDATE',
              entityType: 'kpi_value',
              entityId: raceWinner.valueId,
              oldValue,
              newValue: newValueRow,
              metadata: {
                integrationType,
                externalField: metric.externalFieldName,
                jobId: batchId,
                concurrentRetry: true,
              },
            });
          } else {
            throw insertErr;
          }
        }
      }

      recordsSynced++;
    } catch (err: unknown) {
      errorsCount++;
      logger.error('Failed to upsert KPI value from API sync', {
        tenantId,
        integrationType,
        paramId: metric.paramId,
        externalField: metric.externalFieldName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Trigger score recomputation if any values were synced
  if (recordsSynced > 0) {
    try {
      await submitJob<ScoreRecomputeJobData>('score-recompute', {
        tenantId,
        periodId,
        triggeredBy: 'api-sync',
        nodeId,
      }, {
        singletonKey: `score-recompute-${tenantId}-${periodId}`,
      });
    } catch (err: unknown) {
      logger.error('Failed to enqueue score-recompute after API sync', {
        error: err instanceof Error ? err.message : String(err),
        tenantId,
        periodId,
      });
    }
  }

  await updateProgress(job.id, 'auditing');

  logger.info('API sync completed', {
    tenantId,
    integrationType,
    recordsSynced,
    errorsCount,
    unmappedCount: unmapped.length,
    totalFetched: externalMetrics.length,
  });

  return { recordsSynced, errorsCount, syncedAt: timestamp };
}

// ─── Job Handler ──────────────────────────────────────────────────────────────

/**
 * pg-boss handler for the api-sync queue.
 * Processes each job sequentially — reads integration config, fetches from
 * the external system, maps metrics, and upserts KPI values.
 */
export async function handleApiSync(
  jobs: Job<ApiSyncJobData>[]
): Promise<JobResult<ApiSyncJobResult>[]> {
  const results: JobResult<ApiSyncJobResult>[] = [];

  for (const job of jobs) {
    const { tenantId, integrationType } = job.data;

    try {
      await updateProgress(job.id, 'initializing');

      const result = await processApiSyncJob(job);

      // Update integration status to reflect success
      try {
        await setTenantContext(tenantId);
        const existingConfig = await getIntegrationConfigValue(tenantId, integrationType);
        if (existingConfig) {
          await configRepository.upsertIntegrationConfig(
            tenantId,
            integrationType,
            {
              ...existingConfig,
              lastSyncError: null,
              lastSyncAt: new Date().toISOString(),
              lastSyncStatus: 'success',
            }
          );
        }
      } catch (updateErr) {
        logger.error('Failed to update integration status after sync success', {
          tenantId,
          integrationType,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }

      await updateProgress(job.id, 'complete');

      results.push({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('API sync job failed', {
        tenantId,
        integrationType,
        jobId: job.id,
        error: message,
      });

      // Update integration status to reflect failure
      try {
        await setTenantContext(tenantId);
        const existingConfig = await getIntegrationConfigValue(tenantId, integrationType);
        if (existingConfig) {
          await configRepository.upsertIntegrationConfig(
            tenantId,
            integrationType,
            {
              ...existingConfig,
              lastSyncError: message,
              lastSyncAt: new Date().toISOString(),
              lastSyncStatus: 'failed',
            }
          );
        }
      } catch (updateErr) {
        logger.error('Failed to update integration status after sync failure', {
          tenantId,
          integrationType,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }

      results.push({ success: false, error: message });
    }
  }

  return results;
}

/**
 * Helper to read the current integration config value for status updates.
 * Returns the existing config or null if not found — callers must check
 * for null to avoid clobbering required config fields (endpoint, credentials).
 */
async function getIntegrationConfigValue(
  tenantId: string,
  integrationType: string
): Promise<Record<string, unknown> | null> {
  const row = await configRepository.getIntegrationConfig(tenantId, integrationType);
  if (row) {
    return row.value as Record<string, unknown>;
  }
  return null;
}
