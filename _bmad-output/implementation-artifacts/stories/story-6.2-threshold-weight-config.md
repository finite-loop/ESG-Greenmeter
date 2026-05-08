# Story 6.2: Threshold & Weight Configuration

Status: complete

## Story

As a tenant administrator,
I want to configure scoring thresholds and category weights,
so that ESG scores reflect my industry's context.

## Acceptance Criteria

1. /settings/thresholds shows per-parameter threshold bands with platform defaults
2. Editing creates tenant-specific override, audit logged
3. GET /api/config/weights returns category + pillar weights (merged platform + tenant)
4. PUT /api/config/weights saves overrides (must sum to 100% per level)
5. Saving weights triggers score-recompute job

## Tasks / Subtasks

- [x] Task 1: Create thresholds page (AC: #1, #2)
  - [x] Build /src/app/(dashboard)/settings/thresholds/page.tsx
  - [x] Display per-parameter threshold bands with platform defaults
  - [x] Allow editing to create tenant-specific overrides
  - [x] Log edits to audit trail
- [x] Task 2: Create weights API (AC: #3, #4, #5)
  - [x] GET /src/app/api/config/weights/route.ts — return merged platform + tenant weights
  - [x] PUT /src/app/api/config/weights/route.ts — save overrides with sum validation
  - [x] Validate weights sum to 100% per level (categories, pillars)
  - [x] Trigger score-recompute job via pg-boss on save
- [x] Task 3: Create thresholds API (AC: #1, #2)
  - [x] GET /src/app/api/config/thresholds/route.ts — return merged thresholds
  - [x] PUT /src/app/api/config/thresholds/route.ts — save tenant overrides
- [x] Task 4: Create configService for resolution logic (AC: #3)
  - [x] Implement /src/services/configService.ts
  - [x] resolveConfig pattern: platform_seed → tenant_override merge

### Review Findings

- [x] [Review][Decision] Threshold band model: spec says 3-band (excellent/good/fair) but implementation uses 2-band (redMax/amberMax) matching existing scoring engine — kept 2-band as it matches DB schema and scoring engine
- [x] [Review][Patch] Wrap `replaceWeights` DELETE+INSERT in a `db.transaction()` to prevent data loss on partial failure [configRepository.ts] — applied
- [x] [Review][Patch] Wrap `upsertThreshold` SELECT+INSERT/UPDATE in a transaction to prevent duplicate rows under concurrent requests [configRepository.ts] — applied
- [x] [Review][Patch] Move individual weight validity check (isNaN/range) before sum-to-100 validation to avoid NaN propagation in sum [configService.ts] — applied
- [x] [Review][Patch] Remove unused `thresholdId` field from `thresholdUpdateSchema` to prevent misleading API contract [schemas/config.ts] — applied
- [x] [Review][Patch] Add duplicate category/pillar detection in `saveWeights` before sum validation to prevent constraint violation after delete [configService.ts] — applied
- [x] [Review][Defer] RLS potential bypass via `OR tenantId IS NULL` for platform defaults — pre-existing pattern from scoringRepository, not introduced by this story

## Dev Notes

- Service: /src/services/configService.ts — resolveConfig pattern (platform_seed → tenant_override)
- API: /src/app/api/config/thresholds/route.ts (GET/PUT), /src/app/api/config/weights/route.ts (GET/PUT)
- Page: /src/app/(dashboard)/settings/thresholds/page.tsx
- Thresholds per param: { excellent: number, good: number, fair: number } (boundaries)
- Weights: { categories: [{name, weight}], pillars: [{name, weight}] } — must sum to 100
- On save: trigger score-recompute job via pg-boss

### Depends On
- Story 6.1 (scoring engine must exist)

### References
- [Source: architecture.md#Process Patterns — Configuration Resolution]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6
### Debug Log References
### Completion Notes List
- Created configRepository with threshold/weight CRUD operations and platform/tenant merge logic
- Created configService implementing resolveConfig pattern: platform_seed → tenant_override merge for both thresholds and weights
- Thresholds API (GET/PUT) returns merged thresholds with param name/code info; PUT creates tenant-specific overrides with audit logging
- Weights API (GET/PUT) returns structured weights by level (categories vs pillars); PUT validates sum-to-100% per pillar and overall, triggers score-recompute job via pg-boss
- Updated thresholds page from placeholder to full implementation with Tabs (Thresholds + Weights), filtering by pillar, edit modal for threshold overrides, inline weight editing with real-time sum validation
- Updated weightSchema range from 0-1 to 0-100 to match story requirement of percentage-based weights; scoring engine's weighted average algorithm is scale-independent so no behavioral change
- All 48 new/modified tests pass; no regressions (2 pre-existing failures in goalService.test.ts unrelated to this story)
### Implementation Plan
Implemented configService for resolution logic, then thresholds and weights API routes, then the thresholds settings page with editing capabilities.
### File List
- greenmeter/src/db/repositories/configRepository.ts (new)
- greenmeter/src/services/configService.ts (new)
- greenmeter/src/app/api/config/thresholds/route.ts (new)
- greenmeter/src/app/api/config/weights/route.ts (new)
- greenmeter/src/app/(dashboard)/settings/thresholds/page.tsx (modified — replaced placeholder)
- greenmeter/src/schemas/config.ts (modified — added thresholdUpdateSchema, weightsBatchSchema; changed weight range to 0-100)
- greenmeter/src/services/configService.test.ts (new — 13 tests)
- greenmeter/src/app/api/config/thresholds/route.test.ts (new — 12 tests)
- greenmeter/src/app/api/config/weights/route.test.ts (new — 14 tests)
- greenmeter/src/schemas/config.test.ts (modified — updated weight range test assertions)

## Change Log
- 2026-05-07: Implemented threshold & weight configuration (configService, APIs, UI page, tests)
- 2026-05-07: Applied code review patches — transaction wrapping (configRepository), validation order fix, duplicate detection, removed unused schema field

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing
- 2026-05-07: Status changed to `review` — code review passed, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
