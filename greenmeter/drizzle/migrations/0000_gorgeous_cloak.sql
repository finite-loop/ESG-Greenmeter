CREATE TABLE "audit_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"department" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "scoring_weights" (
	"weight_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"pillar" text NOT NULL,
	"category" text NOT NULL,
	"weight" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_scoring_weights_tenant_pillar_category" UNIQUE("tenant_id","pillar","category")
);
--> statement-breakpoint
CREATE TABLE "tenant_config" (
	"config_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_config_tenant_key" UNIQUE("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "thresholds" (
	"threshold_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"param_id" uuid,
	"category" text,
	"pillar" text,
	"red_max" numeric,
	"amber_max" numeric,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_metrics" (
	"metric_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"standard" text NOT NULL,
	"section" text,
	"topic" text,
	"metric_name" text NOT NULL,
	"metric_value" text,
	"parsed_value" numeric,
	"unit" text,
	"indicator_type" text,
	"additional_context" text,
	"param_id" uuid,
	"mapping_confidence" numeric DEFAULT '0',
	"mapping_method" text,
	"mapping_status" text DEFAULT 'unmapped',
	"mapped_by" uuid,
	"mapped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "peer_kpi_values" (
	"peer_value_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"peer_id" uuid NOT NULL,
	"param_id" uuid NOT NULL,
	"canonical_id" uuid,
	"period_id" uuid,
	"fiscal_year" text,
	"value" numeric,
	"unit" text,
	"source_extraction_id" uuid,
	"source_metric_id" uuid,
	"confidence" numeric,
	"verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_peer_kpi_values_tenant_peer_param_year" UNIQUE("tenant_id","peer_id","param_id","fiscal_year")
);
--> statement-breakpoint
CREATE TABLE "raw_extractions" (
	"extraction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"doc_id" uuid,
	"standard" text NOT NULL,
	"company_name" text NOT NULL,
	"sector" text,
	"country" text,
	"currency" text,
	"reporting_period" text,
	"fiscal_year" text,
	"raw_payload" jsonb NOT NULL,
	"extraction_model" text,
	"extraction_prompt" text,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending_mapping',
	"metric_count" integer,
	"mapped_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "unmapped_metrics" (
	"unmapped_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"peer_id" uuid,
	"standard" text NOT NULL,
	"section" text,
	"metric_name" text NOT NULL,
	"parsed_value" numeric,
	"unit" text,
	"fiscal_year" text,
	"pillar_guess" text,
	"category_guess" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_components" (
	"component_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_value" numeric,
	"weight" numeric DEFAULT '1',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"goal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"param_id" uuid NOT NULL,
	"canonical_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"target_value" numeric NOT NULL,
	"baseline_value" numeric,
	"baseline_year" text,
	"target_year" text NOT NULL,
	"unit" text,
	"direction" text DEFAULT 'lower_is_better',
	"status" text DEFAULT 'active',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"milestone_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_value" numeric,
	"target_date" timestamp with time zone,
	"achieved" boolean DEFAULT false,
	"achieved_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_nodes" (
	"node_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_node_id" uuid,
	"name" text NOT NULL,
	"node_type" text NOT NULL,
	"code" text,
	"currency" text,
	"level" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_periods" (
	"period_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"fiscal_year" text NOT NULL,
	"status" text DEFAULT 'open',
	"locked" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"tenant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"sector" text,
	"country" text DEFAULT 'India',
	"currency" text DEFAULT 'INR',
	"fiscal_year_start" integer DEFAULT 4,
	"active_frameworks" text[],
	"onboarding_complete" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_metrics" (
	"canonical_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"pillar" text NOT NULL,
	"category" text NOT NULL,
	"unit_family" text,
	"direction" text DEFAULT 'lower_is_better',
	"description" text
);
--> statement-breakpoint
CREATE TABLE "kpi_parameters" (
	"param_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"canonical_id" uuid,
	"standard" text NOT NULL,
	"standard_section" text NOT NULL,
	"standard_code" text,
	"disclosure" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pillar" text NOT NULL,
	"unit" text NOT NULL,
	"data_type" text NOT NULL,
	"category" text,
	"indicator_type" text,
	"computation_method" text,
	"how_to_measure" text,
	"how_to_compute" text,
	"how_to_report" text,
	"direction" text DEFAULT 'lower_is_better',
	"rollup_method" text DEFAULT 'SUM',
	"status" text DEFAULT 'active',
	"src" text DEFAULT 'system',
	"depts" text[],
	"standards" text[],
	"priority_order" integer DEFAULT 999,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_kpi_parameters_tenant_standard_code" UNIQUE("tenant_id","standard","code")
);
--> statement-breakpoint
CREATE TABLE "kpi_values" (
	"value_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"param_id" uuid NOT NULL,
	"canonical_id" uuid,
	"node_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"value" numeric,
	"value_text" text,
	"unit" text,
	"source_type" text NOT NULL,
	"source_ref" text,
	"verified" boolean DEFAULT false,
	"not_applicable" boolean DEFAULT false,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_kpi_values_tenant_param_node_period" UNIQUE("tenant_id","param_id","node_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "metric_aliases" (
	"alias_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"param_id" uuid NOT NULL,
	"alias_text" text NOT NULL,
	"standard" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_metric_aliases_param_alias" UNIQUE("param_id","alias_text")
);
--> statement-breakpoint
CREATE TABLE "metric_mapping_rules" (
	"rule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standard" text NOT NULL,
	"section_pattern" text,
	"metric_pattern" text NOT NULL,
	"target_param_id" uuid,
	"priority" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "peer_organisations" (
	"peer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"country" text,
	"market_cap" text,
	"exchange" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_reports" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending',
	"format" text DEFAULT 'pdf',
	"blob_url" text,
	"metadata" jsonb,
	"generated_by" uuid,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"standard" text NOT NULL,
	"version" text,
	"structure" jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_assessments" (
	"assessment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"fiscal_year" text NOT NULL,
	"overall_score" numeric,
	"environmental_score" numeric,
	"social_score" numeric,
	"governance_score" numeric,
	"scope3_contribution" numeric,
	"survey_status" text DEFAULT 'pending',
	"survey_data" jsonb,
	"assessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"supplier_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"sector" text,
	"country" text,
	"contact_email" text,
	"contact_name" text,
	"risk_level" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_weights" ADD CONSTRAINT "scoring_weights_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_config" ADD CONSTRAINT "tenant_config_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thresholds" ADD CONSTRAINT "thresholds_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_metrics" ADD CONSTRAINT "extracted_metrics_extraction_id_raw_extractions_extraction_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."raw_extractions"("extraction_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_metrics" ADD CONSTRAINT "extracted_metrics_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_metrics" ADD CONSTRAINT "extracted_metrics_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_peer_id_peer_organisations_peer_id_fk" FOREIGN KEY ("peer_id") REFERENCES "public"."peer_organisations"("peer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_canonical_id_canonical_metrics_canonical_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_metrics"("canonical_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_period_id_reporting_periods_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."reporting_periods"("period_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_source_extraction_id_raw_extractions_extraction_id_fk" FOREIGN KEY ("source_extraction_id") REFERENCES "public"."raw_extractions"("extraction_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_kpi_values" ADD CONSTRAINT "peer_kpi_values_source_metric_id_extracted_metrics_metric_id_fk" FOREIGN KEY ("source_metric_id") REFERENCES "public"."extracted_metrics"("metric_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_extractions" ADD CONSTRAINT "raw_extractions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmapped_metrics" ADD CONSTRAINT "unmapped_metrics_extraction_id_raw_extractions_extraction_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."raw_extractions"("extraction_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmapped_metrics" ADD CONSTRAINT "unmapped_metrics_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmapped_metrics" ADD CONSTRAINT "unmapped_metrics_peer_id_peer_organisations_peer_id_fk" FOREIGN KEY ("peer_id") REFERENCES "public"."peer_organisations"("peer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_components" ADD CONSTRAINT "goal_components_goal_id_goals_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_components" ADD CONSTRAINT "goal_components_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_canonical_id_canonical_metrics_canonical_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_metrics"("canonical_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goal_id_goals_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_periods" ADD CONSTRAINT "reporting_periods_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_parameters" ADD CONSTRAINT "kpi_parameters_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_parameters" ADD CONSTRAINT "kpi_parameters_canonical_id_canonical_metrics_canonical_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_metrics"("canonical_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_canonical_id_canonical_metrics_canonical_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_metrics"("canonical_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_node_id_org_nodes_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."org_nodes"("node_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_period_id_reporting_periods_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."reporting_periods"("period_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_aliases" ADD CONSTRAINT "metric_aliases_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_mapping_rules" ADD CONSTRAINT "metric_mapping_rules_target_param_id_kpi_parameters_param_id_fk" FOREIGN KEY ("target_param_id") REFERENCES "public"."kpi_parameters"("param_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_organisations" ADD CONSTRAINT "peer_organisations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_template_id_report_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_period_id_reporting_periods_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."reporting_periods"("period_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_assessments" ADD CONSTRAINT "supplier_assessments_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_assessments" ADD CONSTRAINT "supplier_assessments_supplier_id_suppliers_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("supplier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;