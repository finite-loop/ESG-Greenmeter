-- Add missing columns to users table (password_hash, status, last_login, department_id)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'invited';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" timestamp with time zone;
ALTER TABLE "users" DROP COLUMN IF EXISTS "department";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department_id" uuid REFERENCES "org_nodes"("node_id");
ALTER TABLE "users" DROP COLUMN IF EXISTS "active";
