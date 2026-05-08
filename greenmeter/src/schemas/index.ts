import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  tenants,
  orgNodes,
  reportingPeriods,
} from '@/db/schema/tenants';
import { users } from '@/db/schema/auth';
import { kpiParameters, kpiValues, canonicalMetrics } from '@/db/schema/kpi';
import { rawExtractions, extractedMetrics, peerKpiValues } from '@/db/schema/extraction';
import { peerOrganisations } from '@/db/schema/peers';
import { goals, goalComponents, milestones } from '@/db/schema/goals';
import { auditLogs } from '@/db/schema/audit';

// Tenants
export const tenantInsertSchema = createInsertSchema(tenants);
export const tenantSelectSchema = createSelectSchema(tenants);

// Org Nodes
export const orgNodeInsertSchema = createInsertSchema(orgNodes);
export const orgNodeSelectSchema = createSelectSchema(orgNodes);

// Reporting Periods
export const reportingPeriodInsertSchema = createInsertSchema(reportingPeriods);
export const reportingPeriodSelectSchema = createSelectSchema(reportingPeriods);

// Users
export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

// Canonical Metrics
export const canonicalMetricInsertSchema = createInsertSchema(canonicalMetrics);
export const canonicalMetricSelectSchema = createSelectSchema(canonicalMetrics);

// KPI Parameters
export const kpiParameterInsertSchema = createInsertSchema(kpiParameters);
export const kpiParameterSelectSchema = createSelectSchema(kpiParameters);

// KPI Values
export const kpiValueInsertSchema = createInsertSchema(kpiValues);
export const kpiValueSelectSchema = createSelectSchema(kpiValues);

// Raw Extractions
export const rawExtractionInsertSchema = createInsertSchema(rawExtractions);
export const rawExtractionSelectSchema = createSelectSchema(rawExtractions);

// Extracted Metrics
export const extractedMetricInsertSchema = createInsertSchema(extractedMetrics);
export const extractedMetricSelectSchema = createSelectSchema(extractedMetrics);

// Peer Organisations
export const peerOrganisationInsertSchema = createInsertSchema(peerOrganisations);
export const peerOrganisationSelectSchema = createSelectSchema(peerOrganisations);

// Peer KPI Values
export const peerKpiValueInsertSchema = createInsertSchema(peerKpiValues);
export const peerKpiValueSelectSchema = createSelectSchema(peerKpiValues);

// Goals
export const goalInsertSchema = createInsertSchema(goals);
export const goalSelectSchema = createSelectSchema(goals);

// Goal Components
export const goalComponentInsertSchema = createInsertSchema(goalComponents);
export const goalComponentSelectSchema = createSelectSchema(goalComponents);

// Milestones
export const milestoneInsertSchema = createInsertSchema(milestones);
export const milestoneSelectSchema = createSelectSchema(milestones);

// Audit Logs
export const auditLogInsertSchema = createInsertSchema(auditLogs);
export const auditLogSelectSchema = createSelectSchema(auditLogs);
