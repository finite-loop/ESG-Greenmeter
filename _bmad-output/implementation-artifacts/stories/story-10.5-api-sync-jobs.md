# Story 10.5: API Sync Jobs (SAP, Darwinbox)

Status: complete

## Story

As the platform,
I want scheduled sync jobs pulling data from configured ERP/HRMS systems,
so that KPIs update automatically.

## Acceptance Criteria

1. Configured integration with cron schedule triggers api-sync job
2. Job connects to external system, fetches metrics, maps to parameters
3. Upserts kpi_values with source_type='API' and source_ref
4. Each value audit-logged
5. On failure: retries per policy, logs error, updates integration status

## Tasks / Subtasks

- [x] Task 1: Implement apiSync job handler (AC: #1, #2, #3)
  - [x] Job file at /src/jobs/apiSync.ts
  - [x] Read integration config for tenant
  - [x] Connect to external API using stored credentials
  - [x] Fetch data and map external fields to internal param_ids
  - [x] Upsert kpi_values with source_type='API' and source_ref="{integrationType}:{batchId}:{timestamp}"
- [x] Task 2: Schedule registration (AC: #1)
  - [x] Register pg-boss.schedule('api-sync', cronExpression, { tenantId, integrationType })
  - [x] Trigger based on configured cron schedule per integration
- [x] Task 3: Implement metric mapping (AC: #2)
  - [x] Define SAP connector interface (specific API format)
  - [x] Define Darwinbox connector interface (HR metrics: headcount, LTIFR, training hours)
  - [x] Mapping: external field names -> param_ids (configurable per integration in tenant_config)
- [x] Task 4: Implement audit logging and error handling (AC: #4, #5)
  - [x] Audit log each upserted value
  - [x] On connection failure: throw error, retry via pg-boss retry policy
  - [x] On final failure: update integration status, log error
  - [x] Return batch summary (success count, error count)

### Review Findings

- [x] [Review][Decision] Error-rate threshold — decision: keep current behavior, partial success is still success
- [x] [Review][Patch] `getIntegrationConfigValue` returns `null` for missing config; callers check before upserting to avoid clobbering required fields
- [x] [Review][Patch] `lastSyncStatus='success'` update added after successful sync in handleApiSync success path
- [x] [Review][Patch] Non-primitive values from external API rejected by `coerceMetricValue()` — only strings and finite numbers accepted
- [x] [Review][Patch] Root org node query now uses `ORDER BY created_at ASC LIMIT 1` for deterministic selection
- [x] [Review][Patch] Zero-value metrics handled correctly: `coerceMetricValue()` accepts numbers (including 0) and rejects booleans/null/objects
- [x] [Review][Patch] Concurrent upserts catch PostgreSQL error 23505 and retry as update with `concurrentRetry: true` audit metadata
- [x] [Review][Defer] Duplicate external fields mapping to same paramCode silently overwrites — deferred, config-validation concern for story 10.4
- [x] [Review][Defer] Unbounded response body size from external APIs could cause OOM — deferred, infrastructure-level concern

## Dev Notes

- Job: /src/jobs/apiSync.ts
- Schedule: pg-boss.schedule('api-sync', cronExpression, { tenantId, integrationType })
- Handler: read integration config -> connect to external API -> fetch data -> map to params -> upsert values
- SAP connector: specific API format (define interface, implement later or mock)
- Darwinbox connector: HR metrics (headcount, LTIFR, training hours)
- Mapping: external field names -> param_ids (configurable per integration in tenant_config)
- source_ref: "{integrationType}:{batchId}:{timestamp}"
- Error handling: throw on connection failure, retry via pg-boss, update integration status on final failure

### Depends On
- Story 10.4 (integration must be configured)
- Story 1.6 (pg-boss scheduling)

### References
- [Source: product-brief.md — API integration (SAP, Darwinbox)]
- [Source: architecture.md — api-sync queue]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- Implemented full apiSync job handler with processApiSyncJob pipeline: config loading, credential decryption, external API fetch, field mapping, KPI value upsert, audit logging, and score recomputation trigger
- SAP connector parses OData format (d.results array) with 30s timeout, Bearer auth
- Darwinbox connector parses data array format with 30s timeout, Bearer auth
- Field mapping supports both explicit mappings (from integration config fieldMappings) and direct param code matching (case-insensitive)
- KPI values upserted with source_type='api' and source_ref="{integrationType}:{jobId}:{timestamp}"
- Each upserted value audit-logged with CREATE or UPDATE action, including metadata (integrationType, externalField, jobId)
- Score recomputation enqueued after successful sync via singleton key
- On failure: integration status updated with lastSyncError, lastSyncAt, lastSyncStatus='failed'
- Retries handled by pg-boss queue config (retryLimit: 3, retryBackoff: true)
- Added registerApiSyncSchedules() function in jobs/index.ts to register cron schedules from tenant integration configs
- 24 unit tests covering: handler flow (config missing, disabled, no root node, no period, failure recovery), mapping (explicit, fallback, case-insensitive, unmapped), connectors (SAP OData parsing, Darwinbox parsing, HTTP errors, empty values), audit logging (CREATE/UPDATE), score recomputation, error resilience
- Updated existing handlers.test.ts to use new ApiSyncJobData interface
- Updated existing index.test.ts with mocks for new imports

### File List
- greenmeter/src/jobs/apiSync.ts (modified — full implementation replacing placeholder)
- greenmeter/src/jobs/index.ts (modified — added registerApiSyncSchedules, new imports)
- greenmeter/src/jobs/apiSync.test.ts (new — 24 unit tests)
- greenmeter/src/jobs/handlers.test.ts (modified — updated handleApiSync test for new interface)
- greenmeter/src/jobs/index.test.ts (modified — added mocks for new imports)

## Change Log
- 2026-05-08: Full implementation of API sync job handler with SAP and Darwinbox connectors
- 2026-05-08: Added registerApiSyncSchedules for dynamic cron schedule registration
- 2026-05-08: 24 unit tests added, all 1641 project tests passing
- 2026-05-08: Applied 6 code review patches + 1 decision resolved; 28 tests, all 1648 project tests passing

## Status Log
- 2026-05-08: Status changed to `in-progress` — picked up for implementation
- 2026-05-08: Status changed to `review` — all tests passing (1641/1641), implementation complete
- 2026-05-08: Status changed to `complete` — human review approved
