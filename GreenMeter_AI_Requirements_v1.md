# GreenMeter AI — Engineering Requirements v1

> **Purpose:** This document is the authoritative starting point for Claude Code-based generation of the GreenMeter AI backend, frontend, and data layer. Every section is written to be directly consumed as context for code generation prompts.
>
> **Status:** Draft · Based on prototype review and stakeholder discussion
>
> **Conventions used throughout:**
> - `MANUAL` — user-entered via UI
> - `IMPORT` — Excel upload (fixed platform template)
> - `API` — ERP/HRMS or custom integration endpoint
> - `EXTRACTED` — AI-parsed from ingested PDF (peer corpus only in v1)
> - `COMPUTED` — derived from other stored values at read time
> - `CONFIG` — read from tenant/parameter configuration, not a KPI value
> - `SYSTEM` — infrastructure/runtime metric
> - `HISTORICAL` — multiple KPIValue records across periods (used for trends/forecasting)

---

## Table of Contents

- [Part 1 — Domain Model & Data Flows](#part-1--domain-model--data-flows)
  - [1. Core Entities](#1-core-entities)
  - [2. Data Ingestion Pipelines](#2-data-ingestion-pipelines)
  - [3. Cross-Cutting Concerns](#3-cross-cutting-concerns)
- [Part 2 — Screen-by-Screen Data Point Map](#part-2--screen-by-screen-data-point-map)
  - [Screen 1: Onboarding](#screen-1-onboarding)
  - [Screen 2: Dashboard](#screen-2-dashboard)
  - [Screen 3: KPI Console](#screen-3-kpi-console)
  - [Screen 4: Analytics](#screen-4-analytics)
  - [Screen 5: Goals](#screen-5-goals)
  - [Screen 6: Rollup View](#screen-6-rollup-view)
  - [Screen 7: Reports](#screen-7-reports)
  - [Screen 8: Supply Chain ESG](#screen-8-supply-chain-esg)
  - [Screen 9: Settings — Parameters Library](#screen-9-settings--parameters-library)
  - [Screen 10: Settings — Users](#screen-10-settings--users)
  - [Screen 11: Settings — Document Queue](#screen-11-settings--document-queue)
  - [Screen 12: Settings — Audit Logs](#screen-12-settings--audit-logs)
  - [Screen 13: Settings — System Health](#screen-13-settings--system-health)
  - [Screen 14: Knowledge Base](#screen-14-knowledge-base)
- [Appendix A — Open Questions & Deferred Items](#appendix-a--open-questions--deferred-items)
- [Appendix B — Data Source Key](#appendix-b--data-source-key)

---

# Part 1 — Domain Model & Data Flows

---

## 1. Core Entities

### 1.1 Tenant

Represents a single client organisation subscribing to GreenMeter AI. The platform is **multi-tenant, single instance**.

```
Table: tenants
- tenant_id          UUID PRIMARY KEY
- name               TEXT NOT NULL
- industry_sector    TEXT
- hsn_codes          TEXT[]          -- drives automatic peer matching
- nic_codes          TEXT[]          -- drives automatic peer matching
- country            TEXT DEFAULT 'India'
- fiscal_year_start  INTEGER DEFAULT 4  -- month number; April = 4
- base_currency      TEXT DEFAULT 'INR'
- active_frameworks  TEXT[]          -- e.g. ['BRSR','GRI','ESRS','IFRS_S2']
- created_at         TIMESTAMPTZ DEFAULT now()
```

**Seeded defaults (platform team seeds on tenant creation, copied — not referenced):**
- `active_frameworks = ['BRSR']`
- `fiscal_year_start = 4` (April)
- `base_currency = 'INR'`
- Scoring weights: `{ E: 0.33, S: 0.33, G: 0.34 }`
- Peer selection mode: `hsn_nic_auto`

**Admin overrides:** active_frameworks, fiscal_year_start, base_currency, scoring weights, peer_selection_mode.

**Multi-tenancy rule:** Every table includes `tenant_id`. All queries MUST be scoped by `tenant_id`. Row-level security (RLS) enforced at the database layer — application-level filtering alone is insufficient.

---

### 1.2 ReportingPeriod

A fiscal year window for which KPI data is collected.

```
Table: reporting_periods
- period_id    UUID PRIMARY KEY
- tenant_id    UUID REFERENCES tenants
- label        TEXT NOT NULL        -- e.g. 'FY2023-24'
- start_date   DATE NOT NULL
- end_date     DATE NOT NULL
- status       TEXT DEFAULT 'open'  -- 'open' | 'closed'
- locked       BOOLEAN DEFAULT FALSE -- always FALSE in v1; v2 feature
- created_at   TIMESTAMPTZ DEFAULT now()
```

> **Note:** Period locking is deferred to v2. `status = 'closed'` is informational only in v1 — data remains editable. The audit log provides the revert trail.

---

### 1.3 OrgNode (Organisation Hierarchy)

A node in the org rollup tree. Hierarchy levels: `country → region → organisation → subsidiary → facility → department`.

```
Table: org_nodes
- node_id        UUID PRIMARY KEY
- tenant_id      UUID REFERENCES tenants
- parent_node_id UUID REFERENCES org_nodes NULLABLE  -- null for root
- name           TEXT NOT NULL
- type           TEXT NOT NULL  -- 'country'|'region'|'organisation'|'subsidiary'|'facility'|'department'
- currency       TEXT
- active         BOOLEAN DEFAULT TRUE
- created_at     TIMESTAMPTZ DEFAULT now()
```

**Hierarchy rules:**
- Hierarchy is **editable at any time** post-onboarding.
- Deleting a node requires child reassignment; soft-delete only (set `active = FALSE`).
- KPI values for archived nodes are retained; the node is marked inactive.

**Rollup config (per parameter, per node type):**

```
Table: param_rollup_config
- tenant_id      UUID
- param_id       UUID
- rollup_method  TEXT  -- 'SUM' | 'AVERAGE' | 'WEIGHTED_AVG' | 'CUSTOM_FORMULA'
- weight_param   UUID NULLABLE  -- for WEIGHTED_AVG: which param provides the weight (e.g. headcount)
- custom_formula TEXT NULLABLE
PRIMARY KEY (tenant_id, param_id)
```

Platform seeds defaults per parameter type:
- Absolute metrics (GHG tCO2e, energy GJ, water kL): `SUM`
- Ratio/intensity metrics (LTIFR, women %, GHG intensity): `WEIGHTED_AVG` weighted by headcount or revenue
- Admin can override per parameter.

---

### 1.4 KPIParameter

Defines a single ESG metric — its unit, pillar, standards mapping, computation method, thresholds, and department assignments.

```
Table: kpi_parameters
- param_id          UUID PRIMARY KEY
- tenant_id         UUID REFERENCES tenants  -- NULL for system (platform) params
- code              TEXT NOT NULL            -- e.g. 'P6-I-01'
- name              TEXT NOT NULL
- description       TEXT
- pillar            TEXT NOT NULL   -- 'E' | 'S' | 'G'
- unit              TEXT NOT NULL   -- e.g. 'tCO2e', 'GJ', '%', 'kL'
- data_type         TEXT NOT NULL   -- 'number' | 'percentage' | 'text' | 'yes_no' | 'rating'
- category          TEXT            -- e.g. 'GHG Emissions', 'Energy', 'Water'
- standards         TEXT[]          -- e.g. ['BRSR','GRI']
- how_to_measure    TEXT
- how_to_compute    TEXT            -- default compute method description
- how_to_report     TEXT
- rollup_method     TEXT DEFAULT 'SUM'
- status            TEXT DEFAULT 'active'  -- 'active' | 'draft' | 'inactive'
- src               TEXT DEFAULT 'system'  -- 'system' | 'custom'
- depts             TEXT[]          -- assigned department names
- direction         TEXT DEFAULT 'lower_is_better'  -- for scoring/goals: 'lower_is_better' | 'higher_is_better'
- priority_order    INTEGER DEFAULT 999  -- display order in Console and dashboard
- created_at        TIMESTAMPTZ DEFAULT now()
```

**Compute methods (per parameter, multiple options):**

```
Table: param_compute_methods
- method_id    UUID PRIMARY KEY
- param_id     UUID REFERENCES kpi_parameters
- label        TEXT   -- e.g. 'GHG Protocol / AR5 GWP'
- value        TEXT   -- internal key
- formula      TEXT   -- human-readable formula
- is_default   BOOLEAN DEFAULT FALSE
```

**Tenant's selected compute method:**

```
Table: tenant_param_compute_selection
- tenant_id    UUID
- param_id     UUID
- method_id    UUID
PRIMARY KEY (tenant_id, param_id)
```

**Thresholds:**

```
Table: param_thresholds
- tenant_id      UUID
- param_id       UUID
- thresh_enabled BOOLEAN DEFAULT TRUE
- thresh_red     NUMERIC   -- below this = red
- thresh_amber   NUMERIC   -- below this = amber
- thresh_green   NUMERIC   -- at/above this = green
PRIMARY KEY (tenant_id, param_id)
```

**System vs custom:**
- `src = 'system'`: seeded by platform team, shared across tenants. Structural fields read-only. Thresholds and dept assignments overridable.
- `src = 'custom'`: created by client admin, scoped to that tenant only.

---

### 1.5 KPIValue

The actual data point for a parameter, org node, and period.

```
Table: kpi_values
- value_id       UUID PRIMARY KEY
- tenant_id      UUID REFERENCES tenants
- param_id       UUID REFERENCES kpi_parameters
- node_id        UUID REFERENCES org_nodes
- period_id      UUID REFERENCES reporting_periods
- value          NUMERIC NULLABLE    -- NULL if text type
- value_text     TEXT NULLABLE       -- for data_type = 'text' | 'yes_no'
- unit           TEXT
- source_type    TEXT NOT NULL  -- 'MANUAL'|'IMPORT'|'API'|'COMPUTED'
- source_ref     TEXT NULLABLE  -- import batch ID or integration name
- verified       BOOLEAN DEFAULT FALSE
- not_applicable BOOLEAN DEFAULT FALSE
- verified_by    UUID NULLABLE  -- user_id
- verified_at    TIMESTAMPTZ NULLABLE
- created_at     TIMESTAMPTZ DEFAULT now()
- updated_at     TIMESTAMPTZ DEFAULT now()
UNIQUE (tenant_id, param_id, node_id, period_id)
```

**Conflict resolution:** Last write wins. Every write (including overwrites) creates an `audit_logs` entry with `old_value` and `new_value`. This is the revert trail for v1.

**Verification states:**
| State | `verified` | `not_applicable` | Counts toward coverage? |
|---|---|---|---|
| Unverified | FALSE | FALSE | No |
| Verified | TRUE | FALSE | Yes |
| Not applicable | FALSE | TRUE | Yes |

**Rollup values:** Parent node values are `COMPUTED` from children using `rollup_method`. Not stored — computed on read (or cached with cache invalidation on child write).

---

### 1.6 Goal

A sustainability commitment with a target, deadline, milestones, and auto-computed progress.

```
Table: goals
- goal_id       UUID PRIMARY KEY
- tenant_id     UUID REFERENCES tenants
- name          TEXT NOT NULL
- description   TEXT
- target_year   INTEGER NOT NULL
- status        TEXT DEFAULT 'active'  -- 'active' | 'achieved' | 'cancelled'
- created_at    TIMESTAMPTZ DEFAULT now()

Table: goal_components
- component_id  UUID PRIMARY KEY
- goal_id       UUID REFERENCES goals
- param_id      UUID REFERENCES kpi_parameters
- target_value  NUMERIC NOT NULL
- direction     TEXT NOT NULL  -- 'higher_is_better' | 'lower_is_better'
- weight        NUMERIC DEFAULT 1.0  -- relative weight in composite progress

Table: goal_milestones
- milestone_id  UUID PRIMARY KEY
- goal_id       UUID REFERENCES goals
- component_id  UUID REFERENCES goal_components NULLABLE
- label         TEXT NOT NULL
- target_date   DATE NOT NULL
- target_value  NUMERIC NOT NULL
```

**Progress computation:**

```
For each component:
  if direction = 'higher_is_better':
    component_progress = CLAMP(current_value / target_value * 100, 0, 100)
  if direction = 'lower_is_better':
    component_progress = CLAMP((target_value - (current_value - target_value)) / target_value * 100, 0, 100)
    -- simplified: 100 if at/below target, 0 if current >= 2*target

Composite progress = weighted_average(component_progress[], weight[])

Current value = latest verified KPIValue at root org node for most recent closed period.
```

**Milestone progress:** Same formula as component; uses milestone `target_value` instead of goal component `target_value`.

---

### 1.7 PeerOrganisation

An external company in the peer benchmark corpus, identified from ingested documents.

```
Table: peer_organisations
- peer_id     UUID PRIMARY KEY
- tenant_id   UUID REFERENCES tenants
- name        TEXT NOT NULL
- hsn_codes   TEXT[]
- nic_codes   TEXT[]
- sector      TEXT
- country     TEXT
- is_pinned   BOOLEAN DEFAULT FALSE  -- manually selected by admin
- active      BOOLEAN DEFAULT TRUE

Table: peer_kpi_values
- peer_value_id  UUID PRIMARY KEY
- tenant_id      UUID REFERENCES tenants
- peer_id        UUID REFERENCES peer_organisations
- param_id       UUID REFERENCES kpi_parameters
- period_id      UUID NULLABLE  -- matched to closest period
- value          NUMERIC
- source_doc_id  UUID REFERENCES documents
- confidence     NUMERIC  -- 0-100
```

**Peer selection logic:**
1. **Auto:** peers matched where `peer.nic_codes && tenant.nic_codes` (array overlap) OR `peer.hsn_codes && tenant.hsn_codes`
2. **Manual pin:** admin can pin/unpin any org from the corpus. Pinned orgs always included; unpinned excludes them.
3. Both coexist — final peer set = (auto-matched UNION pinned) MINUS unpinned.

**Benchmark computation:**
- Sector median = `PERCENTILE_CONT(0.5)` of peer values for same `param_id` + matched period
- Top quartile = `PERCENTILE_CONT(0.75)` (or 0.25 for lower-is-better metrics)
- Best in class = `MIN` or `MAX` depending on direction
- Percentile rank = percent_rank() of tenant value in peer distribution

---

### 1.8 Document (Ingested PDF)

An ESG/BRSR/Sustainability report PDF ingested into the peer corpus.

```
Table: documents
- doc_id             UUID PRIMARY KEY
- tenant_id          UUID REFERENCES tenants
- filename           TEXT NOT NULL
- organisation_name  TEXT
- period_label       TEXT
- upload_at          TIMESTAMPTZ DEFAULT now()
- status             TEXT DEFAULT 'pending'
                     -- 'pending'|'processing'|'completed'|'failed'
- processing_stage   TEXT  -- 'ocr'|'extraction'|'mapping'|'done'
- progress_pct       NUMERIC DEFAULT 0
- avg_confidence     NUMERIC  -- computed after extraction

Table: doc_metrics
- metric_id         UUID PRIMARY KEY
- doc_id            UUID REFERENCES documents
- metric_name       TEXT
- param_id          UUID NULLABLE  -- mapped by NLP; NULL if unmapped
- raw_value         TEXT
- value             NUMERIC NULLABLE
- unit              TEXT
- pillar            TEXT
- confidence        NUMERIC  -- 0-100
- verified          BOOLEAN DEFAULT FALSE
- corrected_value   NUMERIC NULLABLE
```

> **Scope in v1:** Document ingestion feeds `peer_kpi_values` only. It **never** writes to `kpi_values` for the current tenant. This boundary is strict and must be enforced at the service layer.

---

### 1.9 AuditLog

Immutable, append-only record of every data change and administrative action.

```
Table: audit_logs
- log_id       UUID PRIMARY KEY
- tenant_id    UUID REFERENCES tenants
- timestamp    TIMESTAMPTZ DEFAULT now()
- user_id      UUID NULLABLE   -- NULL for system-generated entries
- user_name    TEXT
- action_type  TEXT NOT NULL
               -- 'DATA_UPDATED'|'USER_APPROVED'|'USER_DEACTIVATED'
               -- 'DOCUMENT_PROCESSED'|'GOAL_UPDATED'|'CONFIG_CHANGED'
               -- 'PARAM_VERIFIED'|'PARAM_NA_SET'|'REPORT_GENERATED'
               -- 'IMPORT_BATCH'|'API_SYNC'
- entity_type  TEXT   -- 'kpi_value'|'user'|'document'|'goal'|'parameter'|'config'
- entity_id    UUID
- old_value    JSONB NULLABLE
- new_value    JSONB NULLABLE
- description  TEXT
```

**Immutability rules:**
- No `UPDATE` or `DELETE` permitted on `audit_logs` ever.
- Write-once enforced at DB level (revoke UPDATE/DELETE privileges on this table).
- Reverting a value in v1 = user manually re-enters the old value (creates a new audit entry). One-click revert is a v2 feature.

---

### 1.10 ESGScore

Computed composite score (0–100) per org node per period.

```
Table: esg_scores
- score_id             UUID PRIMARY KEY
- tenant_id            UUID REFERENCES tenants
- node_id              UUID REFERENCES org_nodes
- period_id            UUID REFERENCES reporting_periods
- total_score          NUMERIC(5,2)
- e_score              NUMERIC(5,2)
- s_score              NUMERIC(5,2)
- g_score              NUMERIC(5,2)
- scoring_model        TEXT DEFAULT 'weighted_average_v1'
- computed_at          TIMESTAMPTZ DEFAULT now()
```

**Computation algorithm:**

```
For each pillar P in [E, S, G]:
  For each active KPIParameter in pillar P with a verified KPIValue for this node+period:
    1. Fetch thresh_red, thresh_amber, thresh_green for this param (tenant override or seed)
    2. Normalise:
       if value >= thresh_green → param_score = 100
       if value <= thresh_red  → param_score = 0
       else → param_score = linear interpolation between 0 and 100
       (for lower_is_better metrics, invert: value <= thresh_green → 100)
    3. param_weight = tenant's configured weight for this param (default: equal weight across all params in pillar)
  pillar_score = weighted_average(param_scores[], param_weights[])

pillar_weight = tenant's E/S/G pillar weights (default: E=0.33, S=0.33, G=0.34)
total_score = weighted_average([e_score, s_score, g_score], pillar_weights)
```

**Recomputation triggers:**
- A `KPIValue` is written (verified state changes or value changes)
- Threshold config changes for any parameter
- Scoring weights change

**Architecture note:** Design scoring as a pluggable service (`ScoringStrategy` interface) to support future industry-standard models (CDP, MSCI, etc.) per tenant.

---

## 2. Data Ingestion Pipelines

All four pipelines write to the same `kpi_values` table. Last write wins. Every write produces an `audit_logs` entry.

---

### 2.1 Manual Entry (`source_type = 'MANUAL'`)

1. User opens KPI Console, selects a parameter cell, types a value.
2. On save: `kpi_values.source_type = 'MANUAL'`, `verified = FALSE` by default.
3. If the user is the designated data owner for this department+parameter, prompt to verify immediately.
4. Thresholds applied immediately to show RAG status.
5. Audit log: `action_type = 'DATA_UPDATED'`, `old_value = {prior value or null}`, `new_value = {saved value}`.

---

### 2.2 Excel Import (`source_type = 'IMPORT'`)

**Template generation:**
- System generates a fixed Excel template on demand per tenant.
- Columns: `param_code | param_name | unit | node_name | node_id | period_label | value | notes`
- Template is generated from the current active parameter set + org hierarchy for the tenant.
- Template is the only accepted format. Arbitrary column mapping is not supported in v1.

**Import processing:**

```
1. Parse uploaded file → validate schema (expected column headers)
2. For each row:
   a. Resolve param_id from param_code (must exist and be active for this tenant)
   b. Resolve node_id from node_id column
   c. Resolve period_id from period_label
   d. Validate value against param data_type
3. If any validation error → reject entire batch (default behaviour; configurable to partial)
4. On success: UPSERT kpi_values with source_type='IMPORT', source_ref=import_batch_id
5. Audit log: single entry per batch with action_type='IMPORT_BATCH', description includes row count and batch ID
6. Post-import: all imported values appear as unverified. Bulk-verify option available.
```

```
Table: import_batches
- batch_id     UUID PRIMARY KEY
- tenant_id    UUID REFERENCES tenants
- filename     TEXT
- uploaded_by  UUID  -- user_id
- uploaded_at  TIMESTAMPTZ
- row_count    INTEGER
- error_count  INTEGER
- status       TEXT  -- 'success'|'partial'|'failed'
```

---

### 2.3 API Integration (`source_type = 'API'`)

**Configuration (admin-managed):**

```
Table: integration_configs
- integration_id   UUID PRIMARY KEY
- tenant_id        UUID REFERENCES tenants
- name             TEXT  -- e.g. 'SAP ERP', 'Darwinbox HRMS', 'Custom'
- endpoint_url     TEXT NOT NULL
- auth_type        TEXT  -- 'api_key'|'oauth2'|'basic'
- credentials      JSONB  -- encrypted at rest (never returned to client)
- sync_schedule    TEXT  -- cron expression, e.g. '0 2 * * *'
- active           BOOLEAN DEFAULT FALSE  -- must be explicitly activated

Table: integration_field_mappings
- mapping_id       UUID PRIMARY KEY
- integration_id   UUID REFERENCES integration_configs
- source_field     TEXT NOT NULL   -- field name in source system response
- param_id         UUID REFERENCES kpi_parameters
- transform        TEXT NULLABLE   -- optional transform expression
```

**Pre-built connector templates (admin provides only endpoint + credentials):**
- SAP: energy consumption, fuel consumption, production volume
- Darwinbox: total headcount, women headcount, training hours, new hires

**Sync flow:**

```
1. On schedule trigger: fetch data from endpoint using stored credentials
2. Apply field_mappings: source_field → param_id
3. Apply transform expression if present
4. UPSERT kpi_values with source_type='API', source_ref=integration_config.name
5. Audit log: action_type='API_SYNC', description includes integration name and record count
```

**Integrations are optional in v1.** No workflow is blocked if no integrations are configured.

---

### 2.4 Document Extraction (`source_type = 'EXTRACTED'` — peer corpus only)

```
Processing pipeline:
  PDF upload
    → OCR (Azure Document Intelligence or equivalent)
    → Text extraction + chunking
    → NLP metric extraction (LLM-assisted)
    → Confidence scoring per extracted metric
    → Parameter mapping (extracted metric name → param_id via fuzzy match + LLM)
    → Store in doc_metrics
    → Compute avg_confidence for document
    → Update document.status = 'completed'

Human review:
  Verify action  → doc_metrics.verified = TRUE
  Correct action → doc_metrics.corrected_value = user_input, verified = TRUE

Benchmark population (after verify/correct):
  → UPSERT peer_kpi_values using doc_metrics.corrected_value (or raw value if not corrected)
```

> **Hard boundary:** This pipeline NEVER writes to `kpi_values`. Enforce at service layer with explicit assertion.

---

## 3. Cross-Cutting Concerns

### 3.1 Multi-Tenancy

- Single PostgreSQL instance. All tables include `tenant_id` as part of every index.
- Enable PostgreSQL Row Level Security (RLS). Set `app.current_tenant_id` in session config at connection time.
- RLS policy example: `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`
- Platform super-admin bypasses RLS via a separate role. All super-admin access is audit-logged with `user_id = SYSTEM_ADMIN_UUID` marker.

---

### 3.2 Defaults System

```
Table: platform_seed_configs
- seed_id      UUID PRIMARY KEY
- config_key   TEXT NOT NULL  -- e.g. 'scoring.pillar_weights'
- config_value JSONB NOT NULL
- version      INTEGER DEFAULT 1

Table: tenant_config_overrides
- tenant_id    UUID
- config_key   TEXT
- config_value JSONB NOT NULL
- overridden_at TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (tenant_id, config_key)
```

**Override resolution:**
```
function getConfig(tenant_id, config_key):
  override = SELECT from tenant_config_overrides WHERE tenant_id AND config_key
  if override exists → return override.config_value
  return SELECT config_value from platform_seed_configs WHERE config_key
```

**Seed update propagation:** When platform updates a seed config value, it propagates to all tenants that do NOT have an entry in `tenant_config_overrides` for that key. Tenants that have overridden retain their value.

---

### 3.3 Coverage Computation

```sql
-- Coverage % for a given framework, tenant, period, node
SELECT
  COUNT(*) FILTER (WHERE kv.verified = TRUE OR kv.not_applicable = TRUE) AS disclosed,
  COUNT(*) AS total,
  ROUND(
    COUNT(*) FILTER (WHERE kv.verified = TRUE OR kv.not_applicable = TRUE)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS coverage_pct
FROM kpi_parameters kp
LEFT JOIN kpi_values kv
  ON kv.param_id = kp.param_id
  AND kv.tenant_id = $tenant_id
  AND kv.period_id = $period_id
  AND kv.node_id = $root_node_id
WHERE
  kp.status = 'active'
  AND $framework = ANY(kp.standards)
  AND (kp.tenant_id IS NULL OR kp.tenant_id = $tenant_id)
```

**States and what they mean for coverage:**

| State | `verified` | `not_applicable` | Counted as disclosed |
|---|---|---|---|
| No value entered | — | — | No |
| Value entered, unverified | FALSE | FALSE | No — shown as "pending verification" |
| Verified | TRUE | FALSE | **Yes** |
| Not applicable | FALSE | TRUE | **Yes** |

---

### 3.4 AI Recommendation Engine

```
Table: recommendations
- rec_id         UUID PRIMARY KEY
- tenant_id      UUID REFERENCES tenants
- type           TEXT  -- 'rule' | 'llm'
- priority       TEXT  -- 'high' | 'medium' | 'low'
- title          TEXT NOT NULL
- body           TEXT
- strategy       TEXT
- param_refs     UUID[]   -- related param_ids
- rule_id        TEXT NULLABLE  -- for rule-based: which rule fired
- generated_at   TIMESTAMPTZ DEFAULT now()
- status         TEXT DEFAULT 'active'
                 -- 'active'|'dismissed'|'valid'|'invalid'
- feedback_at    TIMESTAMPTZ NULLABLE
- feedback_by    UUID NULLABLE

Table: recommendation_feedback
- feedback_id    UUID PRIMARY KEY
- rec_id         UUID REFERENCES recommendations
- tenant_id      UUID REFERENCES tenants
- signal         TEXT  -- 'valid' | 'invalid'
- param_refs     UUID[]
- rule_id        TEXT NULLABLE
- recorded_at    TIMESTAMPTZ DEFAULT now()
```

**Rule-based trigger examples:**
```
Rule: THRESHOLD_BREACH
  Trigger: kpi_value.value crosses thresh_red for any param
  Priority: high
  Action: generate recommendation with improvement action from KBIntervention

Rule: BENCHMARK_GAP
  Trigger: tenant value > sector_median * 1.1 for lower_is_better param
         OR tenant value < sector_median * 0.9 for higher_is_better param
  Priority: medium
  Action: generate peer comparison recommendation

Rule: DEADLINE_APPROACHING
  Trigger: BRSR report due date < 60 days, sections with status != 'complete'
  Priority: high

Rule: SUPPLIER_DATA_MISSING
  Trigger: Supplier survey completion < 70% across active suppliers
  Priority: medium

Rule: ANOMALY_DETECTED
  Trigger: month-over-month change > configured spike_threshold (default 25%)
  Priority: high
```

**LLM-based generation:**
- Scheduled nightly (or triggered manually).
- LLM receives: current KPI snapshot (verified values), benchmark gaps, active goals + progress, active rule-based recommendations already generated.
- LLM decides what additional issues to flag and generates narrative + strategy.
- LLM output stored as `type = 'llm'` recommendations.
- Human marks as `valid` or `invalid` → stored in `recommendation_feedback` for platform team improvement. No client-side retraining in v1.

---

### 3.5 Forecasting Model

Pre-built only in v1. No LLM in forecast computation.

```
Algorithm per goal component parameter:

1. Fetch last N verified annual KPIValues at root node (N = 5, configurable in Settings)
2. Fit linear regression: value ~ year
3. Extrapolate to target_year → BAU forecast
4. Compute R² and residual standard deviation for confidence bands

Scenarios:
  BAU        = regression line
  MODERATE   = BAU + platform-seeded moderate_delta per year for this param type
  AGGRESSIVE = BAU + platform-seeded aggressive_delta per year for this param type

Deltas are stored in:
Table: forecast_intervention_deltas
- param_category   TEXT   -- e.g. 'ghg_absolute', 'energy_intensity', 'renewable_pct'
- scenario         TEXT   -- 'moderate' | 'aggressive'
- delta_per_year   NUMERIC  -- e.g. -0.05 means -5% per year
- delta_type       TEXT   -- 'absolute' | 'percentage'

Goal probability:
  P(achieve by target_year) = fraction of confidence band (BAU ± 2σ) that reaches target
  → express as 0-100%
  → ≥70% → 'On track', 40-69% → 'At risk', <40% → 'Critical'
```

---

# Part 2 — Screen-by-Screen Data Point Map

Each table below lists: **Data Point | Source | Computation | Admin Config Impact**

---

## Screen 1: Onboarding

Multi-step wizard. Collects foundational tenant configuration. All settings editable later in Settings.

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Company name & CIN | `MANUAL` | Stored on `tenants`. CIN validated against MCA format (21-char alphanumeric). | Editable in Settings → Company Profile. |
| Industry / NIC codes | `MANUAL` — HSN/NIC picker | Stored in `tenants.nic_codes[]` and `tenants.hsn_codes[]`. Drives automatic peer matching. | Admin can add/remove post-onboarding. Each change triggers peer corpus re-match. |
| Reporting frameworks | `MANUAL` — checkbox | Stored in `tenants.active_frameworks[]`. Activates corresponding system parameters. | Admin can activate/deactivate. Deactivating hides parameters from UI but retains data. |
| Organisation rollup hierarchy | `MANUAL` — drag-and-drop builder | Creates `org_nodes` records. Root node = main organisation. | Editable in Settings → Organisation. Node deletion requires child reassignment. |
| Fiscal year start month | `MANUAL` — month picker | Stored in `tenants.fiscal_year_start`. Drives period labelling and date filters. | Changeable in Settings. Affects period labels going forward only. |
| KPI parameter preview | `COMPUTED` — from selected frameworks + NIC codes | System parameters filtered to selected frameworks shown as preview. Not editable in wizard. | Actual activation happens on wizard completion. |

---

## Screen 2: Dashboard

Executive summary for the selected org node and period.

### 2.1 ESG Score Strip

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Total ESG Score (e.g. 72/100) | `COMPUTED` — `esg_scores` | Weighted average of E, S, G sub-scores. See §1.10 for full formula. | Pillar weights (E/S/G) configurable by admin. Equal weights by default. |
| E Score (e.g. 68) | `COMPUTED` — `esg_scores.e_score` | Weighted avg of normalised scores for active E-pillar params with verified values. | Parameter weights within E pillar configurable. Thresholds per param determine normalised score. |
| S Score (e.g. 79) | `COMPUTED` — `esg_scores.s_score` | Same logic as E Score for S-pillar. | Same as E Score. |
| G Score (e.g. 71) | `COMPUTED` — `esg_scores.g_score` | Same logic as E Score for G-pillar. | Same as E Score. |
| Score delta vs prior year (e.g. +4 pts) | `COMPUTED` | `current_score − prior_period_score`. Prior period = period with immediately preceding `end_date`. | None — derived from score history. |

### 2.2 Rollup Bar

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Breadcrumb nodes | `COMPUTED` — `org_nodes` | Traverse `parent_node_id` chain from current node to root. | Admin edits hierarchy in Settings. Changes reflect immediately. |
| KPI values at each rollup level | `COMPUTED` — aggregated from children | Apply `rollup_method` (SUM/AVG/WEIGHTED_AVG) up the hierarchy. Computed on read. | Rollup method per parameter configurable. Default: SUM for absolutes, WEIGHTED_AVG for ratios. |

### 2.3 Standard Filter Bar

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Framework tabs (BRSR, GRI, ESRS, IFRS, All) | `CONFIG` — `tenants.active_frameworks` | Only frameworks in `active_frameworks` shown. "All" always shown. | Admin activates/deactivates frameworks in Settings. |
| Parameter count badge (e.g. "45") | `COMPUTED` | `COUNT` of active params mapped to that framework for this tenant. | Adding custom params or changing framework mappings changes count. |

### 2.4 Reporting Frameworks Widget (Donut)

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Total param count per framework | `COMPUTED` — `kpi_parameters` | `COUNT` of active params mapped to each framework. | Activating frameworks or adding custom params changes counts. |
| Disclosed count (e.g. 38 of 45) | `COMPUTED` — `kpi_values` + `kpi_parameters` | `COUNT` of params where `(verified=TRUE OR not_applicable=TRUE)` for current period at root node. | Threshold config does not affect coverage. Only verified/N-A state matters. |
| Coverage % | `COMPUTED` | `disclosed_count / total_count * 100` | Same as disclosed count. |

### 2.5 Peer Benchmark Strip

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Your value (e.g. GHG intensity 4.2) | `COMPUTED` — `kpi_values` | Current period verified value at root node. Intensity = absolute / revenue denominator. | Revenue denominator source configurable: Finance API or manual entry in Settings. |
| Sector median | `COMPUTED` — `peer_kpi_values` | `PERCENTILE_CONT(0.5)` over peer values for same `param_id` + matched period. | Admin peer set (HSN/NIC auto-match + manual pins) affects median. |
| % better/worse vs sector | `COMPUTED` | `(your_value − sector_median) / sector_median * 100`. Sign inverted for lower-is-better. | Peer set changes affect benchmark. Metric direction configured per parameter. |
| Peer count | `COMPUTED` | `COUNT` of active `peer_organisations` matching tenant's NIC/HSN codes + pinned. | Admin peer selections change count. |

### 2.6 GHG Trend Chart

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Scope 1 bars per year | `HISTORICAL` — `kpi_values` (param: GHG Scope 1, node: root) | Verified annual values across available periods, ascending by `period.start_date`. | Param deactivation hides series. Shows last 5 periods by default (configurable). |
| Scope 2 bars per year | `HISTORICAL` — same, param: GHG Scope 2 | Same as Scope 1. | Same. |

### 2.7 Key Parameters Table

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Parameter name | `CONFIG` — `kpi_parameters.name` | Active params for selected framework + pillar. Top 6 by `priority_order`. | Admin reorders via Settings → Parameters `priority_order` field. |
| Value (e.g. 4.2 t/cr) | `COMPUTED` — `kpi_values` | Latest verified value for param at root node, current period. | Unit from `kpi_parameters.unit`. Compute method selection affects value. |
| Benchmark | `COMPUTED` — `peer_kpi_values` | Sector median for the parameter. | Peer set config. |
| Status badge (On track / Review / Below) | `COMPUTED` — threshold comparison | `value >= thresh_green` → On track; `value >= thresh_amber` → Review; else → Below. For lower-is-better, invert. | Admin configures thresholds per parameter. |

### 2.8 AI Recommendations Panel

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Recommendation items | `COMPUTED` — `recommendations` | Active recs for tenant, ordered by priority (high first). Source: rule engine + LLM. | Threshold changes and benchmark gaps determine rule triggers. |
| Priority counts (e.g. "3 high · 4 medium") | `COMPUTED` | `COUNT` grouped by `priority` where `status = 'active'`. | Dismissing recommendations reduces counts. |

### 2.9 Goals Snapshot

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Goal name and target year | `MANUAL` — `goals` entity | Direct read. | Admin creates/edits goals. |
| Progress % | `COMPUTED` — `kpi_values` vs `goal_components.target_value` | Composite progress formula — see §1.6. | Goal component params + weights configured by admin. |
| Status (On track / At risk / Critical) | `COMPUTED` — forecast model | P(achieve by target_year): ≥70% → On track, 40-69% → At risk, <40% → Critical. | Goal target year and value affect probability. |

### 2.10 Alerts & Anomalies

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Alert items | `COMPUTED` — `alerts` table (separate from recommendations) | Rules engine: value spike >threshold vs prior month, implausible zero, supplier data missing, regulatory deadline, new peer docs ingested. | Alert thresholds (e.g. spike >25%) configurable per param by admin. Platform seeds defaults. |
| Alert severity (red/amber/teal) | `CONFIG` — per alert rule | Each rule has a seeded severity. | Severity overrides deferred to v2. |

---

## Screen 3: KPI Console

Primary data entry and management screen. Operates on selected org node and period.

### 3.1 Filters & Header

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Period selector | `CONFIG` — `reporting_periods` | All periods for tenant. Default: most recent open period. | Admin creates periods in Settings. |
| Framework filter | `CONFIG` — `tenants.active_frameworks` | Same as dashboard. | Same. |
| Pillar filter (E/S/G) | UI state | Client-side filter. Default: All. | None. |
| Search | UI | Client-side filter on `param.name`, `param.code`, `param.category`. | None. |

### 3.2 KPI Parameter Cards/Rows

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Parameter code and name | `CONFIG` — `kpi_parameters` | Direct read. | Admin can rename custom params. System params have fixed names. |
| Current value | `MANUAL/IMPORT/API` — `kpi_values` | Latest value for this param + node + period. "—" if not yet entered. | Unit from `kpi_parameters.unit`. |
| YoY change (e.g. ↑3.2%) | `COMPUTED` | `(current − prior) / prior * 100`. Shown only if prior period value exists. | None. |
| Verification state | `kpi_values.verified` + `kpi_values.not_applicable` | Direct read of flags. | Department assignment determines which users see a verify button. |
| RAG status badge | `COMPUTED` — threshold comparison | Compare value to `thresh_red / thresh_amber / thresh_green`. | Admin configures thresholds per parameter. Enable/disable toggle per parameter. |
| Data source indicator | `kpi_values.source_type` | Direct read. Shows MANUAL / IMPORT / API / COMPUTED icon. | None — informational. |
| Sparkline trend | `HISTORICAL` — `kpi_values` (last N periods) | Line of values across last N periods for this param + node. | N (default 5) configurable in Settings → Display. |
| How to measure / compute / report | `CONFIG` — `kpi_parameters` | Direct read of `how_to_measure`, `how_to_compute`, `how_to_report`. Compute method selector switches formula. | System param descriptions are platform-managed. Custom params: admin edits. |

### 3.3 Threshold Configuration (Detail Panel)

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Threshold values (Red/Amber/Green) | `param_thresholds` | Direct read. Inline editable. | Admin sets per parameter. Platform seeds defaults. |
| Threshold enable toggle | `param_thresholds.thresh_enabled` | Direct read/write. | Admin controls. When disabled, no RAG status for that parameter. |

### 3.4 Department Assignment (Detail Panel)

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Department checkboxes | `kpi_parameters.depts[]` | Direct read/write. | Admin sets. Determines which dept users receive data entry prompts. |

---

## Screen 4: Analytics

Four sub-tabs: Peer Benchmark, Rollup Drill-Down, Forecasting, Correlation.

### 4.1 Peer Benchmark Tab

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Your value per KPI | `COMPUTED` — `kpi_values` | Verified value for current period at root node. | Revenue denominator for intensity configurable. |
| Sector median | `COMPUTED` — `peer_kpi_values` | `PERCENTILE_CONT(0.5)` across matched peers for same param + period. | Admin peer set selection. |
| Top quartile | `COMPUTED` | `PERCENTILE_CONT(0.75)` (or 0.25 for lower-is-better). | Same. |
| Best in class | `COMPUTED` | `MIN` or `MAX` depending on direction. | Same. |
| Percentile rank | `COMPUTED` | `percent_rank()` of your value in peer distribution. | Same. |
| Radar chart | `COMPUTED` — normalised param scores | Same normalisation as ESG Score. One axis per parameter. | Threshold config affects normalisation. |

### 4.2 Rollup Drill-Down Tab

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Entity contribution values | `kpi_values` — by node | Direct read per `org_node` for selected param + period. | Rollup method per param configurable. |
| % of total | `COMPUTED` | `node_value / root_node_value * 100` | None. |
| YoY change per entity | `COMPUTED` | `(current_period − prior_period) / prior_period * 100` per node. | None. |

### 4.3 Forecasting Tab

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Historical data points | `HISTORICAL` — `kpi_values` | Verified annual values at root node, all available periods. | None. |
| BAU forecast line | `COMPUTED` — linear regression | Fit on last N verified annual values, extrapolate to target year. | N (default 5) configurable in Settings. |
| Moderate intervention line | `COMPUTED` | BAU + `forecast_intervention_deltas.delta_per_year` (moderate scenario) for this param category. | Platform team updates deltas in seed config. Not admin-configurable in v1. |
| Aggressive intervention line | `COMPUTED` | BAU + aggressive delta. | Same. |
| Goal probability % | `COMPUTED` — confidence bands | Fraction of BAU ± 2σ confidence band that reaches goal target by target year. | Goal target value and year set by admin. |
| AI forecast summary per goal | `COMPUTED` — template + forecast output | Current rate, required rate, gap, probability label. Template-based narrative. | Goals defined by admin. |

### 4.4 Correlation Tab

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Scatter plot data points | `kpi_values` (your facilities) + `peer_kpi_values` | One point per entity (facility or peer) for selected X and Y params, same period. | Admin peer set affects which peer points appear. |
| Correlation coefficient r | `COMPUTED` — Pearson correlation | Computed from scatter plot data points. | None. |
| Correlation heatmap | `COMPUTED` — all param pairs | Pearson r for all pairs of params with ≥ 3 years of verified annual data. | Min years threshold (default 3) configurable. |
| Counts (strong/moderate/weak) | `COMPUTED` | `COUNT` of pairs where `|r| > 0.7` (strong), `0.4–0.7` (moderate), `< 0.4` (weak). | Thresholds are platform constants; not configurable in v1. |
| Insight text + strategy | `COMPUTED` — lookup table or LLM | Curated lookup for known pairs (Energy↔GHG, LTIFR↔Training, etc.). LLM for other pairs. | Platform team curates lookup. LLM prompt is platform-controlled. |

---

## Screen 5: Goals

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Goal name, description, target year | `MANUAL` — `goals` | Direct read. | Admin creates/edits/archives goals. |
| Component params and targets | `MANUAL` — `goal_components` | Admin selects params, sets `target_value`, `direction`, `weight` per component. | Admin edits components and weights at any time. Progress recomputed on change. |
| Overall progress % | `COMPUTED` — `kpi_values` vs targets | Composite formula: weighted avg of component progress percentages. See §1.6. | Component weights configured by admin. |
| Component progress % | `COMPUTED` | `current_value / target_value * 100` (or inverse for lower-is-better). Clamped [0, 100]. | Target value set by admin per component. |
| Milestone list | `MANUAL` — `goal_milestones` | Admin creates milestones with target date, target value, component param. | Admin creates/edits milestones. |
| Milestone progress % | `COMPUTED` | Same formula as component, vs milestone `target_value`. | Milestone target set by admin. |
| On track / At risk / Critical | `COMPUTED` — forecast model | P ≥ 70% → On track, 40–69% → At risk, < 40% → Critical. | Goal target year and target value affect probability. |
| Goal probability % | `COMPUTED` — forecast model | Output of pre-built forecasting model for the primary component parameter. | N years in regression configurable. |

---

## Screen 6: Rollup View

Dedicated hierarchy navigation view. Access from rollup bar on dashboard.

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| ESG score per node (E, S, G, Total) | `COMPUTED` — `esg_scores` | Score computed independently per node using only that node's direct KPI values. Allows cross-entity comparison. | Scoring weights and thresholds same as dashboard. |
| GHG absolute at each node | `kpi_values` or `COMPUTED` rollup | Leaf nodes: direct `kpi_values`. Parent nodes: SUM rollup. | Admin can change rollup method. |
| Water withdrawal at each node | Same pattern as GHG | SUM rollup. | Same. |
| Women % at each node | `kpi_values` or `COMPUTED` | Leaf: direct. Parent: `WEIGHTED_AVG` weighted by headcount param. | Rollup method configurable. Default: `WEIGHTED_AVG` for ratio metrics. |
| Children nodes list | `org_nodes` | `SELECT * FROM org_nodes WHERE parent_node_id = $current_node_id AND active = TRUE`. | Admin edits hierarchy in Settings. |

---

## Screen 7: Reports

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Report templates list | `CONFIG` — platform-seeded templates | Platform provides standard templates for BRSR, GRI, ESRS, IFRS. Custom templates per tenant. | Admin creates/edits custom templates. Standard templates are read-only. |
| Framework coverage banner | `COMPUTED` — same as dashboard coverage widget | Scoped to the framework for the report. | Same coverage logic. |
| Sections list and count | `CONFIG` — framework template | Sections defined in template, each mapping to a set of params. | Admin cannot change standard sections. Custom templates can add sections. |
| Section completion % | `COMPUTED` — `kpi_values` coverage per section | `COUNT(verified or N-A params in section) / COUNT(total params in section)`. | Same coverage logic. |
| Parameter values in report cells | `kpi_values` — current period, root node | Verified values. Unverified values shown with warning flag. | Admin can choose to include/exclude unverified values in report (default: include with flag). |
| Report generation (PDF/XBRL) | `COMPUTED` — template + `kpi_values` | Template engine merges KPI values into framework template. PDF via rendering engine. XBRL for SEBI. | Admin selects format. XBRL requires SEBI credentials in Settings. |
| Report status (Draft/Ready/Submitted) | `reports` entity | Direct read. Admin updates manually in v1. | Submission workflow deferred to v2. |

```
Table: reports
- report_id     UUID PRIMARY KEY
- tenant_id     UUID REFERENCES tenants
- framework     TEXT
- period_id     UUID REFERENCES reporting_periods
- template_id   UUID
- status        TEXT DEFAULT 'draft'  -- 'draft'|'ready'|'submitted'
- output_format TEXT  -- 'pdf'|'xbrl'|'both'
- generated_at  TIMESTAMPTZ
- file_path     TEXT  -- storage path for generated file
```

---

## Screen 8: Supply Chain ESG

### 8.1 Supplier Summary Stats

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Total suppliers count | `COMPUTED` — `supplier_orgs` | `COUNT` of active suppliers for this tenant. | Admin adds/removes suppliers. |
| Data submitted + response rate % | `COMPUTED` — `supplier_survey_responses` | `COUNT(suppliers with ≥1 submitted response) / COUNT(total suppliers) * 100`. | Survey dispatch configured by admin. |
| High risk count | `COMPUTED` — `supplier_scores` | `COUNT WHERE total_score < risk_threshold` (default 40). | Risk threshold configurable by admin. |
| Scope 3 Cat 1 total | `COMPUTED` — `supplier_kpi_values` | `SUM` of Cat 1 emissions across suppliers who submitted data. | Category mapping per supplier configurable. |

### 8.2 Supplier Scorecards

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Supplier ESG score (0–100) | `COMPUTED` — `supplier_scores` | Same weighted-average model as tenant scoring, using supplier-submitted values. | Admin configures supplier scoring weights separately. |
| Scope 3 per supplier | `supplier_kpi_values` — Scope 3 param | Direct read. "—" if not submitted. | Scope 3 param mapping per supplier type configurable. |
| Completion % | `COMPUTED` | `COUNT(submitted params) / COUNT(expected params in survey) * 100`. | Survey parameter set configurable per supplier by admin. |
| Risk badge (Low/Medium/High) | `COMPUTED` — `supplier_scores` | Low: score ≥ 60, Medium: 40–59, High: < 40. | Risk band thresholds configurable by admin. |
| Status (Complete/Partial/Pending) | `COMPUTED` | Complete: completion ≥ 100%, Partial: > 0%, Pending: 0%. | None. |

```
Table: supplier_orgs
- supplier_id   UUID PRIMARY KEY
- tenant_id     UUID REFERENCES tenants
- name          TEXT NOT NULL
- sector        TEXT
- tier          INTEGER DEFAULT 1
- active        BOOLEAN DEFAULT TRUE

Table: supplier_kpi_values
- sup_value_id  UUID PRIMARY KEY
- supplier_id   UUID REFERENCES supplier_orgs
- tenant_id     UUID REFERENCES tenants
- param_id      UUID REFERENCES kpi_parameters
- period_id     UUID REFERENCES reporting_periods
- value         NUMERIC
- scope3_cat    INTEGER NULLABLE  -- GHG Protocol Scope 3 category number
- submitted_at  TIMESTAMPTZ
```

---

## Screen 9: Settings — Parameters Library

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Parameter list | `kpi_parameters` | Direct read. Filtered by search, standard, pillar, type. | Admin manages custom params. System params: thresholds and dept assignments overridable. |
| Standards mapped | `kpi_parameters.standards[]` | Direct read. | Admin can change for custom params. System params: fixed mappings. |
| How to measure/compute/report | `kpi_parameters` fields | Direct read. Compute method dropdown changes formula shown and used. | Admin edits for custom params. System: platform-managed. |
| Compute method selector | `param_compute_methods` + `tenant_param_compute_selection` | Selected method stored per tenant per param. | Admin selects preferred method. Platform seeds default. |
| Threshold config | `param_thresholds` | Inline editable. | Admin sets per param. Platform seeds defaults. |
| Department assignment | `kpi_parameters.depts[]` | Inline editable via checkboxes. | Admin assigns. Determines which users get data entry prompts. |
| Add new parameter | `MANUAL` → creates `kpi_parameters` | Admin fills: code, name, pillar, unit, data_type, standard, status, descriptions, thresholds, departments. | New params appear in Console, dashboard, and report builder immediately on `status = 'active'`. |
| Parameter status | `kpi_parameters.status` | Direct read/write. | Admin toggles. Inactive hides from UI; data retained. |

---

## Screen 10: Settings — Users

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| User list | `users` entity | Direct read. Scoped to tenant. | Admin invites, approves, deactivates users. |
| Role | `users.role` | Direct read. | Admin assigns. Fixed roles in v1: Admin, Analyst, Viewer, Department. |
| Department assignments | `users.depts[]` | Users in departments receive data entry prompts for params assigned to those departments. | Admin assigns departments per user. |
| Last active timestamp | `users.last_active_at` | Updated on every authenticated request. | None — system-managed. |
| Status | `users.status` | Direct read. New registrations: `pending`. | Admin approves/rejects/deactivates. Deactivation removes access; retains audit history. |

```
Table: users
- user_id        UUID PRIMARY KEY
- tenant_id      UUID REFERENCES tenants
- email          TEXT NOT NULL
- name           TEXT
- role           TEXT DEFAULT 'viewer'  -- 'admin'|'analyst'|'viewer'|'department'
- depts          TEXT[]
- status         TEXT DEFAULT 'pending'  -- 'pending'|'active'|'deactivated'
- last_active_at TIMESTAMPTZ
- created_at     TIMESTAMPTZ DEFAULT now()
UNIQUE (tenant_id, email)
```

---

## Screen 11: Settings — Document Queue

Manages peer corpus ingestion. Never writes to tenant's `kpi_values`.

### 11.1 Queue Summary Stats

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Pending/Processing/Completed/Failed counts | `COMPUTED` — `documents` | `COUNT` by `status`. | None. |
| Success rate % | `COMPUTED` | `completed / (completed + failed) * 100`. | None. |
| Avg processing time per doc | `COMPUTED` | `AVG(completed_at − started_at)` for completed docs. | None. |

### 11.2 Document List + Per-Document Metrics

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Filename, org, period, status, stage, progress | `documents` | Direct read. | None. |
| Avg confidence score | `COMPUTED` | `AVG(doc_metrics.confidence)` for all metrics of this document. | None. |
| Per-metric: name, value, pillar, confidence | `doc_metrics` | Direct read. | None. |
| Verify / Correct actions | `doc_metrics.verified` + `doc_metrics.corrected_value` | Verify: sets `verified = TRUE`. Correct: stores `corrected_value`, sets `verified = TRUE`. Both then write to `peer_kpi_values`. | None — user action. |

---

## Screen 12: Settings — Audit Logs

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Summary stats (Today, This week, Total, Active users) | `COMPUTED` — `audit_logs` | `COUNT` grouped by time window. Active users = `COUNT(DISTINCT user_id)` in last 7 days. | None. |
| Audit trail table | `audit_logs` | Direct read. `ORDER BY timestamp DESC`. Paginated. Filterable by date, user, action type. | None — immutable. |
| Export CSV | `audit_logs` — filtered result | Server-side CSV. No row limit. | None. |
| Old value / new value | `audit_logs.old_value` + `audit_logs.new_value` (JSONB) | Stored as JSONB at write time for every `kpi_values` change. | None. |

---

## Screen 13: Settings — System Health

### 13.1 Health Stats

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| System health % | `COMPUTED` — health checks | `% of integration connectors in 'healthy' state`. Green ≥ 90%, Amber 70–89%, Red < 70%. | None. |
| Uptime % (last 30 days) | `COMPUTED` — `uptime_logs` | Ping success rate over rolling 30-day window. | None. |
| Memory / heap usage | `SYSTEM` — `process.memoryUsage()` | Read at request time. | None. |
| Document count | `COMPUTED` | `COUNT(*) FROM documents WHERE status = 'completed'`. | None. |

### 13.2 Environment Info

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Node.js version, App version, Environment, Region | `SYSTEM` — `process.env` | Read from environment variables at runtime. | None — infrastructure-managed. |

### 13.3 Integration Connector Cards

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Connector name, description, status | `integration_configs` + live health check | Status: no config → Not configured; config present → ping endpoint. Healthy if < 300ms + 2xx. | Admin configures endpoint URL, auth credentials (encrypted), field mappings, sync schedule. |
| Response time (ms) | `COMPUTED` — live ping | Measured at page load or last scheduled check. | None. |
| Last sync timestamp | `integration_sync_logs.last_sync_at` | Most recent successful sync. | Admin sets sync schedule (cron). |
| Field mapping config | `integration_field_mappings` | Admin maps source fields to `param_id`. | Admin edits via UI. Takes effect on next sync. |

```
Table: integration_sync_logs
- sync_id        UUID PRIMARY KEY
- integration_id UUID REFERENCES integration_configs
- tenant_id      UUID REFERENCES tenants
- started_at     TIMESTAMPTZ
- completed_at   TIMESTAMPTZ NULLABLE
- status         TEXT  -- 'success'|'failed'|'partial'
- records_synced INTEGER DEFAULT 0
- error_message  TEXT NULLABLE
```

---

## Screen 14: Knowledge Base

Read-only reference library of ESG standards and intervention strategies.

| Data Point | Source | Computation | Admin Config Impact |
|---|---|---|---|
| Parameter definitions | `kb_parameters` — platform-seeded | Direct read. Filterable by standard, pillar, section, search. | Admin cannot edit system KB entries in v1. Custom KB planned for v2. |
| Calculation guidance | `kb_parameters.calc` | Richer than `kpi_parameters` descriptions. Includes worked examples and regulatory references. | Platform-managed. |
| Intervention strategies | `kb_interventions` | Each param has associated interventions: name, desc, impact, effort, timeline, linked KPIs. Basis for AI recommendation strategy text. | Platform-managed. |
| Standards reference | `kb_standards` | Full guidance text for BRSR sections, GRI disclosures, etc. Searchable. | Platform-managed. |

```
Table: kb_parameters
- kb_param_id  UUID PRIMARY KEY
- code         TEXT NOT NULL
- std          TEXT NOT NULL  -- 'BRSR'|'GRI'|'ESRS'|'IFRS_S2'
- section      TEXT
- name         TEXT
- desc         TEXT
- unit         TEXT
- type         TEXT  -- 'Mandatory'|'Essential'|'Voluntary'
- freq         TEXT  -- 'Annual'|'Quarterly'
- source       TEXT  -- where to get data
- scope        TEXT  -- applicability
- pillar       TEXT
- calc         TEXT  -- full calculation guidance

Table: kb_interventions
- intervention_id UUID PRIMARY KEY
- kb_param_id     UUID REFERENCES kb_parameters
- name            TEXT
- description     TEXT
- impact          TEXT  -- 'High'|'Medium'|'Low'
- effort          TEXT  -- 'High'|'Medium'|'Low'
- timeline        TEXT  -- e.g. '6-18 months'
- linked_kpis     TEXT  -- comma-separated param codes affected
```

---

# Appendix A — Open Questions & Deferred Items

| # | Question | v1 Assumption | Deferred to |
|---|---|---|---|
| 1 | Period locking — should submitted periods be read-only? | No locking in v1. Audit log is the revert trail. | v2 |
| 2 | One-click revert from audit log | v1: manual re-entry of old value. | v2 |
| 3 | Supplier survey dispatch mechanism (email, portal, API) | Portal-based self-service in v1. | v2 |
| 4 | Custom role creation | Fixed roles in v1: Admin, Analyst, Viewer, Department. | v2 |
| 5 | XBRL / SEBI direct filing | Report export only in v1. | v2 |
| 6 | LLM model selection and prompt versioning | Platform-managed. No admin control in v1. | v2 |
| 7 | Market-based Scope 2 (RECs / GOs) | Location-based only in v1. | v2 |
| 8 | Scope 3 categories beyond Cat 1 | Cat 1 only via supplier surveys in v1. | v2 |
| 9 | Custom knowledge base entries by admin | Platform-managed KB in v1. | v2 |
| 10 | Alert rule severity override by admin | Platform-seeded severity; not overridable in v1. | v2 |
| 11 | Forecasting probability band — exact statistical method | Engineering to define (suggestion: fraction of Monte Carlo runs that reach target). | v1 — needs decision before implementation |
| 12 | Supplier score computation — exact parameter set | Needs separate design session. Suggest subset of tenant parameters relevant to Scope 3. | v1 — needs decision |

---

# Appendix B — Data Source Key

| Code | Meaning |
|---|---|
| `MANUAL` | User entered directly via the application UI |
| `IMPORT` | Loaded from an Excel file using the fixed platform template |
| `API` | Pulled from an external system (SAP, Darwinbox, or any custom endpoint) via a configured integration |
| `EXTRACTED` | AI-parsed from an ingested PDF. In v1: peer corpus only. Never written to tenant KPI Console. |
| `COMPUTED` | Derived at read time from other stored values using a defined formula or aggregation |
| `CONFIG` | Read from tenant or parameter configuration — a setting, not a KPI value |
| `SYSTEM` | Infrastructure or runtime metric (server health, memory, version info) |
| `HISTORICAL` | Multiple past `kpi_values` records across periods — used for trend charts and forecasting |

---

*Document version: 1.0 · Generated from prototype review and stakeholder discussion · All deferred items must be resolved before the relevant module enters implementation.*
