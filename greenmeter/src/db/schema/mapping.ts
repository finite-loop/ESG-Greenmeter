import { pgTable, uuid, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { kpiParameters } from './kpi';

export const metricMappingRules = pgTable('metric_mapping_rules', {
  ruleId: uuid('rule_id').defaultRandom().primaryKey(),
  standard: text('standard').notNull(),
  sectionPattern: text('section_pattern'),
  metricPattern: text('metric_pattern').notNull(),
  targetParamId: uuid('target_param_id').references(() => kpiParameters.paramId),
  priority: integer('priority').default(0),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const metricAliases = pgTable('metric_aliases', {
  aliasId: uuid('alias_id').defaultRandom().primaryKey(),
  paramId: uuid('param_id').references(() => kpiParameters.paramId).notNull(),
  aliasText: text('alias_text').notNull(),
  standard: text('standard'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('uq_metric_aliases_param_alias').on(table.paramId, table.aliasText),
]);
