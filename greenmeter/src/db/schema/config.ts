import { pgTable, uuid, text, numeric, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { kpiParameters } from './kpi';

export const tenantConfig = pgTable('tenant_config', {
  configId: uuid('config_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  key: text('key').notNull(), // e.g. 'mapping_confidence_threshold', 'display_currency'
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_tenant_config_tenant_key').on(table.tenantId, table.key),
]);

export const scoringWeights = pgTable('scoring_weights', {
  weightId: uuid('weight_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId), // NULL for platform defaults
  pillar: text('pillar').notNull(), // 'E' | 'S' | 'G'
  category: text('category').notNull(),
  weight: numeric('weight').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_scoring_weights_tenant_pillar_category').on(table.tenantId, table.pillar, table.category),
]);

export const recommendations = pgTable('recommendations', {
  recommendationId: uuid('recommendation_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  paramId: uuid('param_id').references(() => kpiParameters.paramId),
  metric: text('metric').notNull(),
  recommendationText: text('recommendation_text').notNull(),
  priority: text('priority').notNull(), // 'critical' | 'warning' | 'info'
  confidence: numeric('confidence'), // 0-100 for LLM, null for rule-based
  source: text('source').notNull(), // 'rule' | 'llm'
  currentValue: numeric('current_value'),
  thresholdValue: numeric('threshold_value'),
  pillar: text('pillar'),
  category: text('category'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_recommendations_tenant_priority').on(table.tenantId, table.priority),
  index('idx_recommendations_tenant_created').on(table.tenantId, table.createdAt),
]);

export const thresholds = pgTable('thresholds', {
  thresholdId: uuid('threshold_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId), // NULL for platform defaults
  paramId: uuid('param_id'), // NULL for category-level thresholds
  category: text('category'),
  pillar: text('pillar'),
  redMax: numeric('red_max'),
  amberMax: numeric('amber_max'),
  unit: text('unit'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
