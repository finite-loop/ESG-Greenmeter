import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const peerOrganisations = pgTable('peer_organisations', {
  peerId: uuid('peer_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(),
  sector: text('sector'),
  country: text('country'),
  marketCap: text('market_cap'), // 'large_cap' | 'mid_cap' | 'small_cap'
  exchange: text('exchange'),
  sourceTenantId: uuid('source_tenant_id').references(() => tenants.tenantId),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
