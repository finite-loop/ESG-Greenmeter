import { pgTable, uuid, text, numeric, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { kpiParameters, canonicalMetrics } from './kpi';

export const goals = pgTable('goals', {
  goalId: uuid('goal_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  paramId: uuid('param_id').references(() => kpiParameters.paramId).notNull(),
  canonicalId: uuid('canonical_id').references(() => canonicalMetrics.canonicalId),
  name: text('name').notNull(),
  description: text('description'),
  targetValue: numeric('target_value').notNull(),
  baselineValue: numeric('baseline_value'),
  baselineYear: text('baseline_year'),
  targetYear: text('target_year').notNull(),
  unit: text('unit'),
  direction: text('direction').default('lower_is_better'), // 'lower_is_better' | 'higher_is_better'
  status: text('status').default('active'), // 'active' | 'achieved' | 'at_risk' | 'missed' | 'archived'
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const goalComponents = pgTable('goal_components', {
  componentId: uuid('component_id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').references(() => goals.goalId, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(),
  targetValue: numeric('target_value'),
  weight: numeric('weight').default('1'),
  paramId: uuid('param_id').references(() => kpiParameters.paramId),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const milestones = pgTable('milestones', {
  milestoneId: uuid('milestone_id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').references(() => goals.goalId, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  targetValue: numeric('target_value'),
  targetDate: timestamp('target_date', { withTimezone: true }),
  status: text('status').default('pending').notNull(), // 'pending' | 'achieved' | 'missed'
  achievedAt: timestamp('achieved_at', { withTimezone: true }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
