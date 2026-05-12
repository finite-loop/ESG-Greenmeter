import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  tenantId: uuid('tenant_id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  domain: text('domain'),
  sector: text('sector'),
  nicCode: text('nic_code'),
  gicsCode: text('gics_code'),
  country: text('country').default('India'),
  currency: text('currency').default('INR'),
  logoUrl: text('logo_url'),
  fiscalYearStart: integer('fiscal_year_start').default(4), // month (1-12)
  activeFrameworks: text('active_frameworks').array(),
  onboardingComplete: boolean('onboarding_complete').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orgNodes = pgTable('org_nodes', {
  nodeId: uuid('node_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  parentNodeId: uuid('parent_node_id'),
  name: text('name').notNull(),
  nodeType: text('node_type').notNull(), // 'company' | 'division' | 'department' | 'site'
  code: text('code'),
  currency: text('currency'),
  level: integer('level').notNull().default(0),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportingPeriods = pgTable('reporting_periods', {
  periodId: uuid('period_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(), // e.g. 'FY 2023-24'
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  fiscalYear: text('fiscal_year').notNull(), // e.g. '2023-24'
  status: text('status').default('open'), // 'open' | 'closed' | 'locked'
  locked: boolean('locked').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
