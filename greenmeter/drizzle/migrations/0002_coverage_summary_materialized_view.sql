-- Story 6.3: Peer Benchmarking — Coverage Summary Materialized View
-- Tracks per-framework completion: total params, values entered, values verified.
-- Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY coverage_summary;

--> statement-breakpoint
CREATE MATERIALIZED VIEW IF NOT EXISTS coverage_summary AS
SELECT
  kp.tenant_id,
  kp.standard AS framework,
  kv_agg.period_id,
  COUNT(kp.param_id) AS total_params,
  COALESCE(kv_agg.has_value_count, 0) AS has_value_count,
  COALESCE(kv_agg.verified_count, 0) AS verified_count,
  CASE
    WHEN COUNT(kp.param_id) = 0 THEN 0
    ELSE ROUND(COALESCE(kv_agg.has_value_count, 0)::numeric / COUNT(kp.param_id) * 100, 1)
  END AS coverage_pct,
  CASE
    WHEN COUNT(kp.param_id) = 0 THEN 0
    ELSE ROUND(COALESCE(kv_agg.verified_count, 0)::numeric / COUNT(kp.param_id) * 100, 1)
  END AS verified_pct,
  NOW() AS computed_at
FROM kpi_parameters kp
CROSS JOIN (
  -- Get all (tenant_id, period_id) combos from kpi_values
  SELECT DISTINCT tenant_id, period_id FROM kpi_values
) periods
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE kv.value IS NOT NULL AND kv.not_applicable = false) AS has_value_count,
    COUNT(*) FILTER (WHERE kv.verified = true) AS verified_count,
    kv.period_id
  FROM kpi_values kv
  WHERE kv.tenant_id = kp.tenant_id
    AND kv.param_id = kp.param_id
    AND kv.period_id = periods.period_id
  GROUP BY kv.period_id
) kv_agg ON kv_agg.period_id = periods.period_id
WHERE kp.tenant_id = periods.tenant_id
  AND kp.status = 'active'
  AND kv_agg.period_id IS NOT NULL
GROUP BY kp.tenant_id, kp.standard, kv_agg.period_id, kv_agg.has_value_count, kv_agg.verified_count;

--> statement-breakpoint
-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_summary_unique
  ON coverage_summary (tenant_id, framework, period_id);

--> statement-breakpoint
-- Performance index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_coverage_summary_lookup
  ON coverage_summary (tenant_id, period_id);
