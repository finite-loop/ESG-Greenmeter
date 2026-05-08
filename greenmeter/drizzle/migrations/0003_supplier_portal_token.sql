-- Add portal_token column to suppliers table for supplier self-service portal
ALTER TABLE "suppliers" ADD COLUMN "portal_token" text UNIQUE;

-- Index for fast portal token lookups
CREATE INDEX IF NOT EXISTS "idx_suppliers_portal_token" ON "suppliers" ("portal_token") WHERE "portal_token" IS NOT NULL;
