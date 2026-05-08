import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const suppliers = pgTable('suppliers', {
  supplierId: uuid('supplier_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(),
  category: text('category'), // 'tier1' | 'tier2' | 'tier3'
  sector: text('sector'),
  country: text('country'),
  contactEmail: text('contact_email'),
  contactName: text('contact_name'),
  riskLevel: text('risk_level'), // 'low' | 'medium' | 'high' | 'critical'
  portalToken: text('portal_token').unique(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supplierAssessments = pgTable('supplier_assessments', {
  assessmentId: uuid('assessment_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.supplierId).notNull(),
  fiscalYear: text('fiscal_year').notNull(),
  overallScore: numeric('overall_score'),
  environmentalScore: numeric('environmental_score'),
  socialScore: numeric('social_score'),
  governanceScore: numeric('governance_score'),
  scope3Contribution: numeric('scope3_contribution'), // tCO2e
  surveyStatus: text('survey_status').default('pending'), // 'pending' | 'sent' | 'submitted' | 'verified'
  surveyData: jsonb('survey_data'),
  assessedAt: timestamp('assessed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
