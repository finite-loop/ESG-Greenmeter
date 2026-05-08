# Story 5.5: Mapping Review UI & Alias Learning

Status: complete

## Story

As an ESG analyst,
I want to review low-confidence mappings and have the system learn from corrections,
so that accuracy improves over time.

## Acceptance Criteria

1. /settings/documents shows "Mapping Review" section with flagged metrics
2. Review table: metric_name, suggested mapping, confidence, actions (confirm/reassign/reject)
3. Confirm: status=manual_mapped, new alias created in metric_aliases
4. Reassign: map to different param, create alias
5. Reject: status=rejected, remains in extracted_metrics
6. New aliases improve future exact-match confidence to 100

## Tasks / Subtasks

- [x] Task 1: Create MappingReviewTable component (AC: #1, #2)
  - [x] Build /src/components/extraction/MappingReviewTable.tsx
  - [x] Display table with metric_name, suggested mapping, confidence, actions columns
  - [x] Include ConfidenceBadge component for visual confidence level
  - [x] Add action buttons: confirm, reassign, reject
- [x] Task 2: Create review API endpoints (AC: #3, #4, #5)
  - [x] GET /api/extraction/[extractionId]/mappings — list flagged metrics
  - [x] PUT /api/extraction/[extractionId]/mappings — update mapping decision
  - [x] Handle confirm: update status to manual_mapped, set mapped_by and mapped_at
  - [x] Handle reassign: update with different param_id, create peer_kpi_values
  - [x] Handle reject: update status to rejected
- [x] Task 3: Implement alias creation logic on confirm/reassign (AC: #3, #4, #6)
  - [x] INSERT INTO metric_aliases (param_id, alias_text, standard) ON CONFLICT DO NOTHING
  - [x] Ensure new aliases feed back into exact-match stage for future extractions
- [x] Task 4: Create ConfidenceBadge component (AC: #2)
  - [x] Build /src/components/extraction/ConfidenceBadge.tsx
  - [x] Color-coded badge: green (>85), yellow (60-85), red (<60)

### Review Findings

#### Decision Needed
- [x] [Review][Decision] No transaction wrapping for multi-step confirm/reassign — partial failure leaves inconsistent state [mappingReviewService.ts:55-140] — FIXED: wrapped confirm/reassign in db.transaction()
- [x] [Review][Decision] Reassign does not clean up old peer_kpi_values row — stale KPI data remains for old paramId [mappingReviewService.ts:99-140] — FIXED: reassign now calls deletePeerKpiValueByMetric before inserting new values
- [x] [Review][Decision] Reject does not clean up old peer_kpi_values row — stale KPI data for prior mapping persists [mappingReviewService.ts:143-164] — RESOLVED: reject preserves existing peer_kpi_values per user decision
- [x] [Review][Decision] Reject clears paramId and is irreversible from UI — should rejection preserve the original suggestion? [mappingReviewService.ts:144-145] — FIXED: reject now preserves paramId (no paramId in update fields)

#### Patch
- [x] [Review][Patch] PUT extractionId from URL not validated against metric's extractionId — cross-extraction modification possible within tenant [route.ts:27,50] — FIXED: extractionId passed to processDecision, validated against metric.extractionId
- [x] [Review][Patch] by-doc route bypasses service-layer pattern — queries DB directly in handler [by-doc/route.ts:26-39] — FIXED: refactored to use mappingReviewService.findExtractionByDocId()
- [x] [Review][Patch] by-doc route has no test file [by-doc/] — FIXED: added route.test.ts with 6 tests
- [x] [Review][Patch] Empty-string fiscalYear fallback `?? ''` should be `?? null` to avoid unique constraint issues [mappingReviewService.ts:207] — FIXED: fiscalYear passed as extraction.fiscalYear (null, not empty string)
- [x] [Review][Patch] _createPeerKpiValue silently skips without logging when extraction/peer not found [mappingReviewService.ts:192,198] — FIXED: added logger.warn calls for both skip paths
- [x] [Review][Patch] reassignTarget state not cleared after successful mutation [MappingReviewTable.tsx:107] — FIXED: onSuccess now clears reassignTarget for acted-upon metricId
- [x] [Review][Patch] Review button uses raw fetch instead of React Query mutation [documents/page.tsx:237-248] — FIXED: refactored to use useMutation with loading state
- [x] [Review][Patch] ConfidenceBadge test duplicates component logic instead of testing actual functions [ConfidenceBadge.test.ts] — FIXED: exported functions from component, test imports them
- [x] [Review][Patch] aliasCreated always returns true even when ON CONFLICT fires (response inaccuracy) [mappingReviewService.ts:76,119] — FIXED: insertAlias returns boolean from rowCount > 0, service uses this value

#### Deferred
- [x] [Review][Defer] pageSize=1000 hardcoded parameter fetch — scalability concern [MappingReviewTable.tsx:83] — deferred, pre-existing pattern
- [x] [Review][Defer] TOCTOU race in updateExtractionMappedCount — count is informational [mappingReviewRepository.ts:238-255] — deferred, low impact
- [x] [Review][Defer] No optimistic locking for concurrent metric decisions [mappingReviewService.ts] — deferred, unlikely concurrent usage
- [x] [Review][Defer] No confirmation dialog before reject action [MappingReviewTable.tsx:256-264] — deferred, UX improvement
- [x] [Review][Defer] Reassign with non-existent paramId — FK constraint catches at DB level [mappingReviewService.ts:99] — deferred, DB safeguard exists
- [x] [Review][Defer] Empty-string metricName creates useless alias — unlikely from extraction pipeline [mappingReviewService.ts:75] — deferred, extraction validates this
- [x] [Review][Defer] Multiple rapid clicks can fire duplicate mutations — depends on Button component [MappingReviewTable.tsx] — deferred, Button likely handles loading

## Dev Notes

- Component: /src/components/extraction/MappingReviewTable.tsx
- API: GET /api/extraction/[extractionId]/mappings (list flagged), PUT /api/extraction/[extractionId]/mappings (update mapping)
- On confirm: UPDATE extracted_metrics SET mapping_status='manual_mapped', mapped_by, mapped_at; INSERT metric_aliases
- On reassign: same but with different param_id; also create peer_kpi_values if not already created
- On reject: UPDATE extracted_metrics SET mapping_status='rejected'
- Alias learning: INSERT INTO metric_aliases (param_id, alias_text, standard) ON CONFLICT DO NOTHING
- Show confidence badge using ConfidenceBadge component (/src/components/extraction/ConfidenceBadge.tsx)

### Depends On
- Story 5.4 (mapped/flagged metrics exist)

### References
- [Source: storage-schema-design.md#Mapping Configuration — alias table]
- [Source: decisions-log.md#D15]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None — clean implementation without debug issues.

### Completion Notes List
- **Task 4 (ConfidenceBadge):** Created color-coded badge component using existing Badge UI primitive. Green (>=85), yellow (60-84), red (<60) thresholds match the mapping service's autoMapThreshold and reviewThreshold.
- **Task 2 (API Endpoints):** Created GET/PUT `/api/extraction/[extractionId]/mappings` using withApiHandler middleware chain. Added `mappingReviewDecisionSchema` Zod schema with refinement for reassign validation. Also created `GET /api/extraction/by-doc` helper endpoint to look up extraction by docId for the UI.
- **Task 3 (Alias Creation):** Implemented in `mappingReviewService.processDecision()`. On confirm/reassign: inserts alias via `INSERT ... ON CONFLICT DO NOTHING` on `(paramId, aliasText)`. Also creates peer_kpi_values and updates extraction mapped count. Aliases automatically feed into Stage 1 (exact alias match) of the mapping cascade in `mappingService.ts`.
- **Task 1 (MappingReviewTable):** Built full review table with metric name, suggested mapping, confidence badge, reassign dropdown (filtered by standard), and action buttons (confirm/reassign/reject). Integrated into `/settings/documents` page with "Review" button on completed documents.
- **Testing:** 51 tests across 5 test files (schema validation, service logic, API routes, by-doc route, component logic). All pass. No regressions in existing tests.
- **Code Review Fixes:** All 4 decision-needed and 9 patch findings addressed. Transactions added for confirm/reassign, reassign deletes old peer_kpi_values, reject preserves paramId, extractionId validated against metric ownership, by-doc route refactored to service layer with tests, aliasCreated reflects actual insertion, reassignTarget cleared on success, review button uses mutation.

### File List
- `greenmeter/src/components/extraction/ConfidenceBadge.tsx` (new)
- `greenmeter/src/components/extraction/ConfidenceBadge.test.ts` (new)
- `greenmeter/src/components/extraction/MappingReviewTable.tsx` (new)
- `greenmeter/src/db/repositories/mappingReviewRepository.ts` (new)
- `greenmeter/src/services/mappingReviewService.ts` (new)
- `greenmeter/src/services/mappingReviewService.test.ts` (new)
- `greenmeter/src/app/api/extraction/[extractionId]/mappings/route.ts` (new)
- `greenmeter/src/app/api/extraction/[extractionId]/mappings/route.test.ts` (new)
- `greenmeter/src/app/api/extraction/by-doc/route.ts` (new, then refactored to use service layer)
- `greenmeter/src/app/api/extraction/by-doc/route.test.ts` (new — 6 tests)
- `greenmeter/src/schemas/extraction.ts` (modified — added mappingReviewDecisionSchema)
- `greenmeter/src/schemas/extraction.test.ts` (modified — added mappingReviewDecisionSchema tests)
- `greenmeter/src/lib/queryKeys.ts` (modified — added mappingReview key factory)
- `greenmeter/src/app/(dashboard)/settings/documents/page.tsx` (modified — added Mapping Review section)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (41 new tests, 0 regressions)
- 2026-05-07: Status changed to `review` — code review findings addressed (4 decisions + 9 patches), 51 tests passing, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
