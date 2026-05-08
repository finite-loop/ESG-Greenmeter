import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { tenants, orgNodes } from './tenants';

export const users = pgTable('users', {
  userId: uuid('user_id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: text('role').notNull().default('viewer'), // 'admin' | 'analyst' | 'department' | 'viewer'
  departmentId: uuid('department_id').references(() => orgNodes.nodeId),
  status: text('status').notNull().default('invited'), // 'active' | 'invited' | 'deactivated'
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'oauth' | 'oidc' | 'email'
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);
