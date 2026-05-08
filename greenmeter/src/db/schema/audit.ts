import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const auditLogs = pgTable('audit_logs', {
  logId: uuid('log_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: uuid('user_id'),
  action: text('action').notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'IMPORT'
  entityType: text('entity_type').notNull(), // 'kpi_value' | 'goal' | 'user' | 'config' | etc.
  entityId: uuid('entity_id').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  metadata: jsonb('metadata'), // request context: IP, user-agent, correlation ID
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
