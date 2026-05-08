-- Create recommendations table for AI-generated and rule-based alerts
CREATE TABLE IF NOT EXISTS "recommendations" (
  "recommendation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id"),
  "param_id" uuid REFERENCES "kpi_parameters"("param_id"),
  "metric" text NOT NULL,
  "recommendation_text" text NOT NULL,
  "priority" text NOT NULL, -- 'critical' | 'warning' | 'info'
  "confidence" numeric, -- 0-100 for LLM recommendations, NULL for rule-based
  "source" text NOT NULL, -- 'rule' | 'llm'
  "current_value" numeric,
  "threshold_value" numeric,
  "pillar" text,
  "category" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_recommendations_tenant_priority"
  ON "recommendations" ("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "idx_recommendations_tenant_created"
  ON "recommendations" ("tenant_id", "created_at");

-- CHECK constraints for enum-like columns
ALTER TABLE "recommendations" ADD CONSTRAINT chk_recommendations_priority
  CHECK (priority IN ('critical', 'warning', 'info'));

ALTER TABLE "recommendations" ADD CONSTRAINT chk_recommendations_source
  CHECK (source IN ('rule', 'llm'));

-- RLS policy for tenant isolation
ALTER TABLE "recommendations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations_tenant_isolation" ON "recommendations"
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
