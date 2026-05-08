import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants, reportingPeriods } from './tenants';

export const reportTemplates = pgTable('report_templates', {
  templateId: uuid('template_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId), // NULL for platform templates
  name: text('name').notNull(),
  standard: text('standard').notNull(), // 'BRSR' | 'ESRS' | 'GRI' | 'IFRS_S2'
  version: text('version'),
  structure: jsonb('structure'), // template layout definition
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const generatedReports = pgTable('generated_reports', {
  reportId: uuid('report_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  templateId: uuid('template_id').references(() => reportTemplates.templateId).notNull(),
  periodId: uuid('period_id').references(() => reportingPeriods.periodId).notNull(),
  name: text('name').notNull(),
  status: text('status').default('pending'), // 'pending' | 'generating' | 'complete' | 'failed'
  format: text('format').default('pdf'), // 'pdf' | 'xbrl' | 'excel'
  blobUrl: text('blob_url'), // Azure Blob Storage URL
  metadata: jsonb('metadata'), // coverage stats, generation params
  generatedBy: uuid('generated_by'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
