# GreenMeter AI — Unified Storage Schema Design

> Supports: free-text extraction → fuzzy mapping → structured storage
> Principle: Separate parameter entries per standard, linked by `canonical_id`

---

## 1. Canonical Parameter Registry

Cross-standard reference linking equivalent metrics across BRSR, ESRS, and GRI.

```sql
Table: canonical_metrics
- canonical_id       UUID PRIMARY KEY
- canonical_name     TEXT NOT NULL          -- e.g. "GHG Scope 1 Emissions"
- pillar             TEXT NOT NULL          -- 'E' | 'S' | 'G'
- category           TEXT NOT NULL          -- e.g. 'Emissions', 'Energy', 'Water', 'Workforce'
- unit_family        TEXT                   -- e.g. 'mass_co2e', 'energy', 'volume', 'ratio', 'count'
- direction          TEXT DEFAULT 'lower_is_better'  -- 'lower_is_better' | 'higher_is_better'
- description        TEXT
```

**Purpose:** Enables cross-standard analytics (MDS, correlation) by grouping equivalent parameters.
**Example:** One `canonical_id` for "Scope 1 GHG" links:
- BRSR: P6 → "Scope 1 GHG (tCO2e)"
- ESRS: E1 → "Scope 1 GHG (tCO2e)"
- GRI: 305-1 → "Scope 1 GHG (tCO2e)"

---

## 2. KPI Parameters (Per-Standard, with Canonical Link)

Extended from the existing requirements spec to include standard-specific structure and canonical linkage.

```sql
Table: kpi_parameters
- param_id           UUID PRIMARY KEY
- tenant_id          UUID REFERENCES tenants NULLABLE  -- NULL for system/platform params
- canonical_id       UUID REFERENCES canonical_metrics NULLABLE  -- NULL if no cross-standard equiv
- standard           TEXT NOT NULL          -- 'BRSR' | 'ESRS' | 'GRI' | 'IFRS_S2'
- standard_section   TEXT NOT NULL          -- BRSR: 'P6 – Environment', ESRS: 'ESRS E1', GRI: 'GRI 305'
- standard_code      TEXT                   -- GRI: '305-1', ESRS: 'E1-6', BRSR: null (no codes)
- disclosure         TEXT                   -- BRSR: 'Emissions – Scope 1', ESRS: 'Scope 1 Emissions', GRI: 'Direct GHG emissions'
- code               TEXT NOT NULL          -- Internal param code e.g. 'BRSR-P6-E-01'
- name               TEXT NOT NULL          -- Display name e.g. 'Scope 1 GHG (tCO2e)'
- description        TEXT
- pillar             TEXT NOT NULL          -- 'E' | 'S' | 'G'
- unit               TEXT NOT NULL          -- e.g. 'tCO2e', 'GJ', '%', 'count'
- data_type          TEXT NOT NULL          -- 'number' | 'percentage' | 'text' | 'yes_no' | 'rating'
- category           TEXT                   -- e.g. 'GHG Emissions', 'Energy', 'Water'
- indicator_type     TEXT                   -- 'essential' | 'leadership' (BRSR) | 'mandatory' | 'voluntary'
- computation_method TEXT                   -- e.g. 'GHG Protocol Corp. Standard – direct emissions'
- how_to_measure     TEXT
- how_to_compute     TEXT
- how_to_report      TEXT
- direction          TEXT DEFAULT 'lower_is_better'
- rollup_method      TEXT DEFAULT 'SUM'
- status             TEXT DEFAULT 'active'
- src                TEXT DEFAULT 'system'  -- 'system' | 'custom'
- depts              TEXT[]
- standards          TEXT[]                 -- for multi-tag: ['BRSR','GRI'] on a single entry (legacy compat)
- priority_order     INTEGER DEFAULT 999
- created_at         TIMESTAMPTZ DEFAULT now()

UNIQUE (tenant_id, standard, code)  -- one entry per standard per tenant
```

---

## 3. Raw Extraction Store (Immutable)

Stores the full LLM extraction output as-is for audit and re-processing.

```sql
Table: raw_extractions
- extraction_id      UUID PRIMARY KEY
- tenant_id          UUID REFERENCES tenants
- doc_id             UUID REFERENCES documents NULLABLE  -- linked to doc if from PDF ingestion
- standard           TEXT NOT NULL          -- 'BRSR' | 'ESRS' | 'GRI'
- company_name       TEXT NOT NULL
- sector             TEXT
- country            TEXT
- currency           TEXT
- reporting_period   TEXT
- fiscal_year        TEXT
- raw_payload        JSONB NOT NULL         -- full JSON from LLM extraction
- extraction_model   TEXT                   -- which LLM model produced this
- extraction_prompt  TEXT                   -- version/hash of the prompt used
- extracted_at       TIMESTAMPTZ DEFAULT now()
- status             TEXT DEFAULT 'pending_mapping'
                     -- 'pending_mapping' | 'mapped' | 'partially_mapped' | 'failed'
- metric_count       INTEGER                -- total metrics in payload
- mapped_count       INTEGER DEFAULT 0      -- how many successfully mapped
```

**Immutability rule:** No UPDATE on `raw_payload` ever. Re-extraction creates a new row.

---

## 4. Extracted Metrics (Parsed from Raw, Pre-Mapping)

Individual metrics parsed out of the raw JSON, awaiting mapping to `kpi_parameters`.

```sql
Table: extracted_metrics
- metric_id          UUID PRIMARY KEY
- extraction_id      UUID REFERENCES raw_extractions
- tenant_id          UUID REFERENCES tenants
- standard           TEXT NOT NULL          -- 'BRSR' | 'ESRS' | 'GRI'
- section            TEXT                   -- BRSR: principle_number, ESRS: standard_code, GRI: gri_series
- topic              TEXT                   -- sub-grouping within section
- metric_name        TEXT NOT NULL          -- free-text as extracted by LLM
- metric_value       TEXT                   -- raw value (may be "NIL", "1,60,000", "Yes", etc.)
- parsed_value       NUMERIC NULLABLE       -- cleaned numeric value (NULL if non-numeric)
- unit               TEXT
- indicator_type     TEXT                   -- 'essential' | 'leadership' | 'mandatory' | 'voluntary'
- additional_context TEXT
- -- Mapping fields
- param_id           UUID REFERENCES kpi_parameters NULLABLE  -- NULL until mapped
- mapping_confidence NUMERIC DEFAULT 0      -- 0-100, from fuzzy matcher
- mapping_method     TEXT                   -- 'exact' | 'fuzzy' | 'llm' | 'manual'
- mapping_status     TEXT DEFAULT 'unmapped'
                     -- 'unmapped' | 'auto_mapped' | 'manual_mapped' | 'rejected' | 'unmatched'
- mapped_by          UUID NULLABLE          -- user_id if manual
- mapped_at          TIMESTAMPTZ NULLABLE
```

---

## 5. Peer KPI Values (Mapped Metrics for Benchmarking)

Once a metric is mapped (confidence > threshold OR human-verified), it flows here.

```sql
Table: peer_kpi_values
- peer_value_id      UUID PRIMARY KEY
- tenant_id          UUID REFERENCES tenants
- peer_id            UUID REFERENCES peer_organisations
- param_id           UUID REFERENCES kpi_parameters NOT NULL
- canonical_id       UUID REFERENCES canonical_metrics NULLABLE  -- denormalized for fast cross-std queries
- period_id          UUID REFERENCES reporting_periods NULLABLE
- fiscal_year        TEXT                   -- fallback if no matching period_id
- value              NUMERIC
- unit               TEXT
- source_extraction_id UUID REFERENCES raw_extractions
- source_metric_id   UUID REFERENCES extracted_metrics
- confidence         NUMERIC                -- inherited from mapping confidence
- verified           BOOLEAN DEFAULT FALSE
- created_at         TIMESTAMPTZ DEFAULT now()

UNIQUE (tenant_id, peer_id, param_id, fiscal_year)
```

---

## 6. Unmapped Metrics Store (For Exploratory Analytics)

Metrics that couldn't be mapped to known parameters — retained for MDS and correlation analysis.

```sql
Table: unmapped_metrics
- unmapped_id        UUID PRIMARY KEY
- extraction_id      UUID REFERENCES raw_extractions
- tenant_id          UUID REFERENCES tenants
- peer_id            UUID REFERENCES peer_organisations NULLABLE
- standard           TEXT NOT NULL
- section            TEXT
- metric_name        TEXT NOT NULL
- parsed_value       NUMERIC NULLABLE
- unit               TEXT
- fiscal_year        TEXT
- pillar_guess       TEXT                   -- 'E' | 'S' | 'G' | NULL (inferred from section)
- category_guess     TEXT                   -- inferred from topic/section
- created_at         TIMESTAMPTZ DEFAULT now()
```

**Use case:** MDS and correlation analysis can query BOTH `peer_kpi_values` (structured) AND `unmapped_metrics` (exploratory) to discover patterns across all available data.

---

## 7. Mapping Configuration

Rules and aliases that power the fuzzy mapping layer.

```sql
Table: metric_mapping_rules
- rule_id            UUID PRIMARY KEY
- standard           TEXT NOT NULL
- section_pattern    TEXT                   -- regex or exact match for section
- metric_pattern     TEXT NOT NULL          -- regex or fuzzy pattern for metric_name
- target_param_id    UUID REFERENCES kpi_parameters
- priority           INTEGER DEFAULT 0      -- higher priority rules win
- active             BOOLEAN DEFAULT TRUE
- created_at         TIMESTAMPTZ DEFAULT now()

-- Example rows:
-- ('BRSR', 'P6%', '%Scope 1%emission%', <param_id for BRSR Scope 1>, 10, TRUE)
-- ('ESRS', 'ESRS E1', '%Scope 1%GHG%', <param_id for ESRS Scope 1>, 10, TRUE)

Table: metric_aliases
- alias_id           UUID PRIMARY KEY
- param_id           UUID REFERENCES kpi_parameters
- alias_text         TEXT NOT NULL          -- alternative name seen in documents
- standard           TEXT
- created_at         TIMESTAMPTZ DEFAULT now()

UNIQUE (param_id, alias_text)

-- Example: param "Scope 1 GHG (tCO2e)" has aliases:
-- "Total Scope 1 emissions"
-- "Direct GHG emissions"
-- "Scope 1 greenhouse gas emissions"
-- "GHG Scope 1 (MtCO2e)"
```

**Mapping algorithm (executed in order):**
1. **Exact match:** `metric_name` matches a `metric_aliases.alias_text` exactly → confidence 100
2. **Pattern match:** `metric_name` matches a `metric_mapping_rules.metric_pattern` → confidence 85
3. **Fuzzy match:** Levenshtein/trigram similarity > 0.8 against `kpi_parameters.name` or aliases → confidence 70
4. **LLM-assisted:** Send unmapped metric + candidate params to LLM for classification → confidence per LLM response
5. **Unmatched:** If nothing above threshold (default 60) → goes to `unmapped_metrics` + human review queue

---

## 8. Current Org KPI Values (Manual / CRM / Import)

Unchanged from requirements spec — the existing `kpi_values` table. Added `canonical_id` for cross-standard queries.

```sql
Table: kpi_values
- value_id           UUID PRIMARY KEY
- tenant_id          UUID REFERENCES tenants
- param_id           UUID REFERENCES kpi_parameters
- canonical_id       UUID REFERENCES canonical_metrics NULLABLE  -- denormalized
- node_id            UUID REFERENCES org_nodes
- period_id          UUID REFERENCES reporting_periods
- value              NUMERIC NULLABLE
- value_text         TEXT NULLABLE
- unit               TEXT
- source_type        TEXT NOT NULL          -- 'MANUAL' | 'IMPORT' | 'API' | 'COMPUTED'
- source_ref         TEXT NULLABLE
- verified           BOOLEAN DEFAULT FALSE
- not_applicable     BOOLEAN DEFAULT FALSE
- verified_by        UUID NULLABLE
- verified_at        TIMESTAMPTZ NULLABLE
- created_at         TIMESTAMPTZ DEFAULT now()
- updated_at         TIMESTAMPTZ DEFAULT now()

UNIQUE (tenant_id, param_id, node_id, period_id)
```

---

## 9. Cross-Standard Analytics Views

Materialized views for MDS and correlation analysis.

```sql
-- View: All metrics (mapped + unmapped) for a peer, normalized to canonical grouping
CREATE MATERIALIZED VIEW peer_metrics_unified AS
SELECT
  pv.tenant_id,
  pv.peer_id,
  po.name AS peer_name,
  po.sector,
  cm.canonical_name,
  cm.pillar,
  cm.category,
  cm.direction,
  kp.standard,
  kp.name AS param_name,
  pv.value,
  kp.unit,
  pv.fiscal_year
FROM peer_kpi_values pv
JOIN kpi_parameters kp ON pv.param_id = kp.param_id
JOIN peer_organisations po ON pv.peer_id = po.peer_id
LEFT JOIN canonical_metrics cm ON pv.canonical_id = cm.canonical_id

UNION ALL

SELECT
  um.tenant_id,
  um.peer_id,
  po.name AS peer_name,
  po.sector,
  um.metric_name AS canonical_name,
  um.pillar_guess AS pillar,
  um.category_guess AS category,
  NULL AS direction,
  um.standard,
  um.metric_name AS param_name,
  um.parsed_value AS value,
  um.unit,
  um.fiscal_year
FROM unmapped_metrics um
LEFT JOIN peer_organisations po ON um.peer_id = po.peer_id
WHERE um.parsed_value IS NOT NULL;

-- Refresh: after any new extraction is fully mapped
```

---

## 10. Data Flow Summary

```
PEER PATH (PDF Extraction):
  PDF → Document Intelligence → LLM (BRSR/ESRS/GRI prompt)
    → raw_extractions (immutable JSON)
    → extracted_metrics (parsed individual metrics)
    → Mapping Layer (aliases → patterns → fuzzy → LLM → manual)
    → peer_kpi_values (mapped, confidence > threshold)
    → unmapped_metrics (below threshold, retained for MDS)

CURRENT ORG PATH (Manual/CRM/Import/API):
  Manual entry / Excel import / API sync
    → kpi_values (direct write, source_type tagged)
    → audit_logs (every change)

ANALYTICS PATH:
  peer_metrics_unified (materialized view)
    + kpi_values (current org)
    → MDS computation (multi-dimensional scaling)
    → Correlation matrix (feature-selected, industry-wise)
    → Competitive positioning dashboard
```

---

## 11. Key Design Decisions

| Decision | Rationale |
|---|---|
| Separate param per standard + canonical_id link | Preserves standard-specific nuance (units, boundaries, indicator types) while enabling cross-standard analysis |
| Free-text extraction + post-hoc mapping | Resilient to document variability; extraction LLM not constrained to fixed vocabulary |
| Immutable raw_extractions | Audit trail; allows re-mapping when rules improve without re-extraction |
| Mapping confidence threshold (default 60) | Below 60 → human review queue. Above 85 → auto-accept. 60-85 → accept but flag for review. |
| Unmapped metrics retained | Critical for MDS — unknown metrics may carry signal for competitive positioning |
| Denormalized canonical_id on value tables | Avoids expensive JOINs in analytics queries; updated on write |
| Materialized view for unified analytics | Pre-computed for dashboard performance; refreshed on new data |
