import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb, unique, bigint } from 'drizzle-orm/pg-core';
import { tenants, reportingPeriods } from './tenants';
import { kpiParameters, canonicalMetrics } from './kpi';
import { peerOrganisations } from './peers';

export const documents = pgTable('documents', {
  docId: uuid('doc_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  peerId: uuid('peer_id').references(() => peerOrganisations.peerId).notNull(),
  standard: text('standard').notNull(), // 'BRSR' | 'ESRS' | 'GRI'
  fiscalYear: text('fiscal_year').notNull(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  blobPath: text('blob_path').notNull(),
  blobUrl: text('blob_url'),
  status: text('status').default('pending').notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  jobId: text('job_id'), // pg-boss job ID for tracking
  errorMessage: text('error_message'),
  uploadedBy: uuid('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rawExtractions = pgTable('raw_extractions', {
  extractionId: uuid('extraction_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  docId: uuid('doc_id').references(() => documents.docId),
  standard: text('standard').notNull(), // 'BRSR' | 'ESRS' | 'GRI'
  companyName: text('company_name').notNull(),
  sector: text('sector'),
  country: text('country'),
  currency: text('currency'),
  reportingPeriod: text('reporting_period'),
  fiscalYear: text('fiscal_year'),
  rawPayload: jsonb('raw_payload').notNull(), // full JSON from LLM — NEVER updatable
  extractionModel: text('extraction_model'),
  extractionPrompt: text('extraction_prompt'),
  extractedAt: timestamp('extracted_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('pending_mapping'), // 'pending_mapping' | 'mapped' | 'partially_mapped' | 'failed'
  metricCount: integer('metric_count'),
  mappedCount: integer('mapped_count').default(0),
});

export const extractedMetrics = pgTable('extracted_metrics', {
  metricId: uuid('metric_id').defaultRandom().primaryKey(),
  extractionId: uuid('extraction_id').references(() => rawExtractions.extractionId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  standard: text('standard').notNull(),
  section: text('section'),
  topic: text('topic'),
  metricName: text('metric_name').notNull(),
  metricValue: text('metric_value'),
  parsedValue: numeric('parsed_value'),
  unit: text('unit'),
  indicatorType: text('indicator_type'),
  additionalContext: text('additional_context'),
  // Mapping fields
  paramId: uuid('param_id').references(() => kpiParameters.paramId),
  mappingConfidence: numeric('mapping_confidence').default('0'),
  mappingMethod: text('mapping_method'), // 'exact' | 'fuzzy' | 'llm' | 'manual'
  mappingStatus: text('mapping_status').default('unmapped'), // 'unmapped' | 'auto_mapped' | 'manual_mapped' | 'rejected' | 'unmatched'
  mappedBy: uuid('mapped_by'),
  mappedAt: timestamp('mapped_at', { withTimezone: true }),
});

export const peerKpiValues = pgTable('peer_kpi_values', {
  peerValueId: uuid('peer_value_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  peerId: uuid('peer_id').references(() => peerOrganisations.peerId).notNull(),
  paramId: uuid('param_id').references(() => kpiParameters.paramId).notNull(),
  canonicalId: uuid('canonical_id').references(() => canonicalMetrics.canonicalId),
  periodId: uuid('period_id').references(() => reportingPeriods.periodId),
  fiscalYear: text('fiscal_year'),
  value: numeric('value'),
  unit: text('unit'),
  sourceExtractionId: uuid('source_extraction_id').references(() => rawExtractions.extractionId),
  sourceMetricId: uuid('source_metric_id').references(() => extractedMetrics.metricId),
  confidence: numeric('confidence'),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_peer_kpi_values_tenant_peer_param_year').on(table.tenantId, table.peerId, table.paramId, table.fiscalYear),
]);

export const unmappedMetrics = pgTable('unmapped_metrics', {
  unmappedId: uuid('unmapped_id').defaultRandom().primaryKey(),
  extractionId: uuid('extraction_id').references(() => rawExtractions.extractionId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  peerId: uuid('peer_id').references(() => peerOrganisations.peerId),
  standard: text('standard').notNull(),
  section: text('section'),
  metricName: text('metric_name').notNull(),
  parsedValue: numeric('parsed_value'),
  unit: text('unit'),
  fiscalYear: text('fiscal_year'),
  pillarGuess: text('pillar_guess'), // 'E' | 'S' | 'G' | NULL
  categoryGuess: text('category_guess'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
