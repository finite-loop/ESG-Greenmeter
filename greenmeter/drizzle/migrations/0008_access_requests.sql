CREATE TABLE IF NOT EXISTS "access_requests" (
  "request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "company" text NOT NULL,
  "industry" text,
  "job_title" text,
  "password_hash" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "review_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "access_requests_email_unique" ON "access_requests" USING btree ("email");
