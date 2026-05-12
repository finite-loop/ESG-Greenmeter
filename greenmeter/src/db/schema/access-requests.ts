import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const accessRequests = pgTable('access_requests', {
  requestId: uuid('request_id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  company: text('company').notNull(),
  industry: text('industry'),
  jobTitle: text('job_title'),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
