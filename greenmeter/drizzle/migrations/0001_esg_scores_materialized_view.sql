-- Story 6.1: ESG Scoring Engine — Materialized View
-- Pre-computes ESG scores per (tenant, node, period) for fast dashboard queries.
-- Refresh via: REFRESH MATERIALIZED VIEW CONCURRENTLY esg_scores;

--> statement-breakpoint
CREATE MATERIALIZED VIEW IF NOT EXISTS esg_scores AS
WITH param_scores AS (
  -- Step 1: Normalize each KPI value to a 0-100 score using threshold bands
  SELECT
    kv.tenant_id,
    kv.node_id,
    kv.period_id,
    kp.param_id,
    kp.pillar,
    COALESCE(kp.category, 'Uncategorized') AS category,
    kv.value::numeric AS raw_value,
    kp.direction,
    -- Resolve thresholds: param-specific → category-level → pillar-level → defaults
    COALESCE(
      (SELECT t.red_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id = kp.param_id
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      (SELECT t.red_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id IS NULL
         AND t.category = kp.category AND t.pillar = kp.pillar
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      (SELECT t.red_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id IS NULL AND t.category IS NULL AND t.pillar = kp.pillar
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      30
    ) AS red_max,
    COALESCE(
      (SELECT t.amber_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id = kp.param_id
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      (SELECT t.amber_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id IS NULL
         AND t.category = kp.category AND t.pillar = kp.pillar
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      (SELECT t.amber_max::numeric FROM thresholds t
       WHERE (t.tenant_id = kv.tenant_id OR t.tenant_id IS NULL)
         AND t.param_id IS NULL AND t.category IS NULL AND t.pillar = kp.pillar
       ORDER BY CASE WHEN t.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      60
    ) AS amber_max
  FROM kpi_values kv
  INNER JOIN kpi_parameters kp
    ON kv.param_id = kp.param_id AND kv.tenant_id = kp.tenant_id
  WHERE kv.value IS NOT NULL
    AND kv.not_applicable = false
    AND kv.value ~ '^-?[0-9]*\.?[0-9]+$'  -- only numeric values
),
normalized AS (
  -- Step 2: Apply threshold-based normalization
  SELECT
    tenant_id, node_id, period_id, param_id, pillar, category,
    CASE
      WHEN COALESCE(direction, 'lower_is_better') = 'lower_is_better' THEN
        CASE
          WHEN raw_value <= red_max THEN 100
          WHEN raw_value <= amber_max THEN
            CASE WHEN amber_max = red_max THEN 75
                 ELSE ROUND(100 - ((raw_value - red_max) / (amber_max - red_max)) * 50)
            END
          ELSE GREATEST(ROUND(49 * (1 - LEAST((raw_value - amber_max) / GREATEST(amber_max * 2, 1), 1))), 0)
        END
      ELSE -- higher_is_better
        CASE
          WHEN raw_value >= amber_max THEN 100
          WHEN raw_value >= red_max THEN
            CASE WHEN amber_max = red_max THEN 75
                 ELSE ROUND(50 + ((raw_value - red_max) / (amber_max - red_max)) * 50)
            END
          WHEN red_max = 0 THEN 0
          ELSE GREATEST(ROUND((raw_value / red_max) * 49), 0)
        END
    END AS param_score
  FROM param_scores
),
category_scores AS (
  -- Step 3: Average param scores per category (with param count)
  SELECT
    tenant_id, node_id, period_id, pillar, category,
    ROUND(AVG(param_score)) AS category_score,
    COUNT(*) AS param_count
  FROM normalized
  GROUP BY tenant_id, node_id, period_id, pillar, category
),
weighted_pillar AS (
  -- Step 4: Weighted average of categories per pillar
  SELECT
    cs.tenant_id, cs.node_id, cs.period_id, cs.pillar, cs.category,
    cs.category_score, cs.param_count,
    COALESCE(
      (SELECT sw.weight::numeric FROM scoring_weights sw
       WHERE (sw.tenant_id = cs.tenant_id OR sw.tenant_id IS NULL)
         AND sw.pillar = cs.pillar AND sw.category = cs.category
       ORDER BY CASE WHEN sw.tenant_id IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1),
      1
    ) AS weight
  FROM category_scores cs
),
pillar_scores AS (
  SELECT
    tenant_id, node_id, period_id, pillar,
    COALESCE(ROUND(SUM(category_score * weight) / NULLIF(SUM(weight), 0)), 0) AS pillar_score
  FROM weighted_pillar
  GROUP BY tenant_id, node_id, period_id, pillar
),
overall_scores AS (
  -- Step 5: Weighted average of pillar scores for overall
  -- Uses scoring_weights entries with category='_overall' as pillar-level weights
  SELECT
    tenant_id, node_id, period_id,
    COALESCE(ROUND(
      SUM(pillar_score * pillar_weight) / NULLIF(SUM(pillar_weight), 0)
    ), 0) AS overall_score
  FROM (
    SELECT
      ps.*,
      COALESCE(
        (SELECT sw.weight::numeric FROM scoring_weights sw
         WHERE (sw.tenant_id = ps.tenant_id OR sw.tenant_id IS NULL)
           AND sw.pillar = ps.pillar AND sw.category = '_overall'
         ORDER BY CASE WHEN sw.tenant_id IS NOT NULL THEN 0 ELSE 1 END
         LIMIT 1),
        1
      ) AS pillar_weight
    FROM pillar_scores ps
  ) weighted_pillars
  GROUP BY tenant_id, node_id, period_id
)
-- Final output: one row per (tenant, node, period, pillar, category)
SELECT
  wp.tenant_id,
  wp.node_id,
  wp.period_id,
  wp.pillar,
  wp.category,
  wp.category_score,
  wp.param_count,
  COALESCE(ps.pillar_score, 0) AS pillar_score,
  COALESCE(os.overall_score, 0) AS overall_score,
  NOW() AS computed_at
FROM weighted_pillar wp
JOIN pillar_scores ps USING (tenant_id, node_id, period_id, pillar)
JOIN overall_scores os USING (tenant_id, node_id, period_id);

--> statement-breakpoint
-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_scores_unique
  ON esg_scores (tenant_id, node_id, period_id, pillar, category);

--> statement-breakpoint
-- Performance index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_esg_scores_lookup
  ON esg_scores (tenant_id, node_id, period_id);
