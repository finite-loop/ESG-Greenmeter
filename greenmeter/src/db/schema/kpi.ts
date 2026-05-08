import { pgTable, uuid, text, integer, numeric, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants, orgNodes, reportingPeriods } from './tenants';

export const canonicalMetrics = pgTable('canonical_metrics', {
  canonicalId: uuid('canonical_id').defaultRandom().primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  pillar: text('pillar').notNull(),
  category: text('category').notNull(),
  unitFamily: text('unit_family'),
  direction: text('direction').default('lower_is_better'),
  description: text('description'),
});

export const kpiParameters = pgTable('kpi_parameters', {
  paramId: uuid('param_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId),
  canonicalId: uuid('canonical_id').references(() => canonicalMetrics.canonicalId),
  standard: text('standard').notNull(),
  standardSection: text('standard_section').notNull(),
  standardCode: text('standard_code'),
  disclosure: text('disclosure'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  pillar: text('pillar').notNull(),
  unit: text('unit').notNull(),
  dataType: text('data_type').notNull(),
  category: text('category'),
  indicatorType: text('indicator_type'),
  computationMethod: text('computation_method'),
  howToMeasure: text('how_to_measure'),
  howToCompute: text('how_to_compute'),
  howToReport: text('how_to_report'),
  direction: text('direction').default('lower_is_better'),
  rollupMethod: text('rollup_method').default('SUM'),
  status: text('status').default('active'),
  src: text('src').default('system'),
  depts: text('depts').array(),
  standards: text('standards').array(),
  priorityOrder: integer('priority_order').default(999),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('uq_kpi_parameters_tenant_standard_code').on(table.tenantId, table.standard, table.code),
]);

export const kpiValues = pgTable('kpi_values', {
  valueId: uuid('value_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  paramId: uuid('param_id').references(() => kpiParameters.paramId).notNull(),
  canonicalId: uuid('canonical_id').references(() => canonicalMetrics.canonicalId),
  nodeId: uuid('node_id').references(() => orgNodes.nodeId).notNull(),
  periodId: uuid('period_id').references(() => reportingPeriods.periodId).notNull(),
  value: numeric('value'),
  valueText: text('value_text'),
  unit: text('unit'),
  sourceType: text('source_type').notNull(),
  sourceRef: text('source_ref'),
  verified: boolean('verified').default(false),
  notApplicable: boolean('not_applicable').default(false),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('uq_kpi_values_tenant_param_node_period').on(table.tenantId, table.paramId, table.nodeId, table.periodId),
]);
