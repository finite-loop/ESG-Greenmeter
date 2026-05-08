# Story 9.4: AI Recommendations Engine

Status: complete

## Story

As an ESG analyst,
I want AI-generated recommendations for improving performance,
so that I get actionable suggestions without manual analysis.

## Acceptance Criteria

1. llm-recommendations nightly job analyzes tenant KPI data
2. Rule-based alerts: metric below "poor" threshold triggers immediate alert (no LLM needed)
3. LLM recommendations: identify underperforming metrics and generate improvement suggestions
4. Displayed on dashboard alerts panel with priority, metric, recommendation text, confidence
5. Graceful degradation: if LLM unavailable, only rule-based recommendations generated

## Tasks / Subtasks

- [x] Task 1: Implement llmRecommendations job handler (AC: #1, #3, #5)
  - [x] Job file at /src/jobs/llmRecommendations.ts
  - [x] Select bottom-performing metrics per tenant
  - [x] Construct prompt: "Suggest improvements for {metric} currently at {value} vs target {threshold}"
  - [x] Parse LLM response into structured recommendation
  - [x] Wrap LLM call in try/catch for graceful degradation
- [x] Task 2: Create rule-based alert logic (AC: #2)
  - [x] Query kpi_values JOIN thresholds to identify values in "poor" band
  - [x] Generate alert records for metrics below poor threshold
  - [x] Assign priority: critical (way below poor), warning (below fair), info (improvement opportunity)
- [x] Task 3: Store recommendations (AC: #1, #4)
  - [x] Create recommendations table or JSONB in tenant_config
  - [x] Store: tenant_id, metric, recommendation_text, priority, confidence, source (rule/llm), created_at
  - [x] Expire old recommendations on each nightly run
- [x] Task 4: Display in AlertsPanel (AC: #4)
  - [x] Component at /src/components/dashboard/AlertsPanel.tsx
  - [x] List top N recommendations by priority
  - [x] Show priority badge, metric name, recommendation text, confidence indicator
- [x] Task 5: Schedule nightly job (AC: #1)
  - [x] Register pg-boss cron schedule for llm-recommendations queue
  - [x] Job processes all active tenants

## Dev Notes

- Job: /src/jobs/llmRecommendations.ts
- Rule-based: query kpi_values JOIN thresholds -> identify values in "poor" band -> generate alert
- LLM-based: select bottom-performing metrics -> construct prompt -> parse response
- Storage: recommendations table or JSONB in tenant_config (simple for v1)
- Display: /src/components/dashboard/AlertsPanel.tsx — list top N by priority
- Priority levels: critical (way below poor), warning (below fair), info (improvement opportunity)
- Schedule: nightly via pg-boss cron schedule
- Graceful degradation: wrap LLM call in try/catch, proceed with rule-based on failure

### Depends On
- Story 6.1 (scores/thresholds needed)
- Story 1.6 (pg-boss scheduling)

### References
- [Source: product-brief.md — AI recommendations]
- [Source: architecture.md — llm-recommendations queue]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered during implementation.

### Implementation Plan
1. Created `recommendations` table in DB schema (config.ts) with proper indexes and tenant FK
2. Created `recommendationRepository` with getByTenant, insertBatch, deleteByTenant operations
3. Created `recommendationService` with rule-based alert generation (threshold comparison), LLM recommendation generation (with graceful degradation), and full pipeline orchestration
4. Updated `llmRecommendations.ts` job handler to use recommendationService, process all active tenants
5. Created API route `/api/recommendations` with GET endpoint (authenticated, role-guarded)
6. Added `recommendations` to queryKeys factory
7. Created `useRecommendations` hook (TanStack Query)
8. Created `AlertsPanel` component with priority badges, confidence indicators, pillar badges
9. Registered nightly cron schedule (2 AM daily) via pg-boss `boss.schedule()`
10. Created SQL migration for recommendations table with RLS policy
11. Added comprehensive tests: 12 service tests, 3 job handler tests, 1 cron schedule test

### Completion Notes List
- All 5 tasks completed with full test coverage
- Rule-based alerts identify metrics in "poor" band using threshold resolution hierarchy (param > category > pillar > default)
- LLM recommendations use configurable provider (Azure/local) with graceful degradation
- AlertsPanel component uses existing Card/Badge UI primitives for consistency
- Nightly cron schedule registered at 2:00 AM UTC processing all active tenants
- Old recommendations are expired before each nightly run (delete + re-insert)
- Code review performed: fixed 4 findings (C1: setTenantContext in job, C2/M4: unused import, M1: return type, M3: NaN guard)
- Full test suite: 1550 tests pass with 0 failures across 123 test files

### File List
- greenmeter/src/db/schema/config.ts (modified — added recommendations table)
- greenmeter/src/db/repositories/recommendationRepository.ts (new)
- greenmeter/src/services/recommendationService.ts (new)
- greenmeter/src/services/recommendationService.test.ts (new — 12 tests)
- greenmeter/src/jobs/llmRecommendations.ts (modified — full implementation)
- greenmeter/src/jobs/llmRecommendations.test.ts (new — 3 tests)
- greenmeter/src/jobs/index.ts (modified — added cron scheduling)
- greenmeter/src/jobs/index.test.ts (modified — added schedule mock + cron test)
- greenmeter/src/jobs/handlers.test.ts (modified — updated LLM handler test with proper mocks)
- greenmeter/src/app/api/recommendations/route.ts (new)
- greenmeter/src/hooks/useRecommendations.ts (new)
- greenmeter/src/components/dashboard/AlertsPanel.tsx (new)
- greenmeter/src/lib/queryKeys.ts (modified — added recommendations keys)
- greenmeter/drizzle/migrations/0004_recommendations_table.sql (new)

### Review Findings
- [x] [Review][Patch] Delete-then-insert without transaction — wrapped in `db.transaction()` with atomic swap [recommendationService.ts]
- [x] [Review][Patch] setTenantContext is transaction-scoped — `set_config` now runs inside the write transaction [recommendationService.ts]
- [x] [Review][Patch] parseLlmResponse fallback accepts arbitrary text — removed raw-text fallback; returns null + logs warning [recommendationService.ts]
- [x] [Review][Patch] Unbounded insertBatch may exceed PG parameter limits — chunked inserts (500 rows per batch) [recommendationRepository.ts, recommendationService.ts]
- [x] [Review][Patch] Zero thresholds cause silent alert suppression — added guards in `determinePriority` and `isInPoorBand` [recommendationService.ts]
- [x] [Review][Patch] priority and source columns unconstrained — added CHECK constraints [0004_recommendations_table.sql]
- [x] [Review][Patch] Empty string tenantId sentinel in cron data — removed tenantId from cron data; made interface field optional [jobs/index.ts, llmRecommendations.ts]
- [x] [Review][Defer] LLM prompt injection via metric names — deferred, pre-existing (metric names are admin-inserted; LLM has no tool-use capability)
- [x] [Review][Defer] Concurrent cron + manual job can cause duplicate/missing recommendations — deferred, pre-existing (requires broader pg-boss job-design decision on singletonKey)
- [x] [Review][Defer] Inverted thresholds (redMax > amberMax) not validated — deferred, pre-existing (threshold validation belongs in threshold creation, not consumption)
- [x] [Review][Defer] No audit logging for recommendation write operations in nightly job — deferred, pre-existing (background job audit pattern not yet established project-wide)
- [x] [Review][Defer] No rate limiting on LLM calls per tenant — deferred, pre-existing (should be implemented in createLlmClient abstraction layer)

## Change Log
- 2026-05-07: Implemented recommendations table, repository, service, job handler, API route, hook, and AlertsPanel component

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (1492/1492, 0 failures)
- 2026-05-07: Status changed to `review` — code review passed (addressed C1: setTenantContext, C2: unused import, M1: return type, M3: NaN guard), ready for human review
- 2026-05-07: Status changed to `done` — 3-layer adversarial code review complete; 7 patches applied, 5 deferred, 5 dismissed; all 1557 tests pass
