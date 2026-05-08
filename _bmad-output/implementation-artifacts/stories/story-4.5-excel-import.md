# Story 4.5: KPI Excel Import

Status: complete

## Story

As an ESG analyst,
I want to upload an Excel file to bulk-import KPI values,
so that I can migrate data without manual re-entry.

## Acceptance Criteria

1. Excel import modal on Console page accepts .xlsx files
2. System parses file and shows preview with match status per row
3. Confirming import creates kpi_values with source_type='IMPORT'
4. Unmatched rows highlighted with skip/manual-map options
5. POST /api/kpi/import validates file format and size, returns success/error counts
6. Each imported value individually audit-logged

## Tasks / Subtasks

- [x] Create ExcelImportModal component (AC: #1, #2, #4)
  - [x] Build `/src/components/console/ExcelImportModal.tsx`
  - [x] Add file upload input accepting .xlsx files
  - [x] Display preview table with match status per row (matched/unmatched/duplicate)
  - [x] Highlight unmatched rows (red bg) and duplicate rows (amber bg) with skip option
  - [x] Add confirm button to trigger import with row count
- [x] Create file parsing logic — server-side (AC: #2, #5)
  - [x] Parse uploaded Excel using `exceljs` package
  - [x] Match Excel column headers to parameter codes/names via flexible aliases
  - [x] Return preview response with matched, unmatched, and duplicate row counts
- [x] Create preview endpoint (AC: #2, #4, #5)
  - [x] POST `/src/app/api/kpi/import/route.ts` — accept multipart/form-data
  - [x] Validate file format (.xlsx) and size (max 10MB)
  - [x] Return parsed preview with match status
- [x] Create confirm import endpoint (AC: #3, #5, #6)
  - [x] POST `/src/app/api/kpi/import/confirm/route.ts` — accept JSON body
  - [x] Bulk insert matched values with source_type='import'
  - [x] Return success/error counts in response
  - [x] Audit log entry for overall import via _audit metadata

### Review Findings
- [x] [Review][Decision] Manual-map option for unmatched rows is missing (AC #4) — implemented: parameter dropdown for unmatched rows in preview table
- [x] [Review][Patch] loadParameterIndex uses only platform params (tenantId IS NULL), ignoring tenant overrides — fixed: now uses parameterRepository.findAllForMatching with tenant merge
- [x] [Review][Patch] Formula/rich-text/hyperlink/error cells stringify to [object Object] — fixed: added extractCellValue helper for all ExcelJS complex cell types
- [x] [Review][Patch] Per-value audit logging missing — fixed: each successfully imported value now individually audit-logged via recordAudit
- [x] [Review][Patch] Service directly queries DB bypassing parameterRepository — fixed: replaced direct db query with parameterRepository.findAllForMatching
- [x] [Review][Patch] File type validates application/vnd.ms-excel (.xls MIME) but parser only supports .xlsx — fixed: removed .xls MIME from both server and client
- [x] [Review][Patch] Date cells produce locale-dependent strings — fixed: Date instances now converted to ISO string in extractCellValue
- [x] [Review][Patch] nodeId and periodId state not reset between modal opens — fixed: added to resetModal callback
- [x] [Review][Patch] MAX_FILE_SIZE duplicated as magic number in component — fixed: imports MAX_IMPORT_FILE_SIZE from schemas/kpiImport
- [x] [Review][Defer] No transaction wrapping for batch confirm inserts [excelImportService.ts:378] — deferred, pre-existing pattern
- [x] [Review][Defer] N+1 query in preview (sequential duplicate check per row) [excelImportService.ts:293] — deferred, performance optimization
- [x] [Review][Defer] No max row count limit on confirm endpoint [kpiImport.ts:60] — deferred, FK+unique constraints protect data

## Dev Notes

- Component: `/src/components/console/ExcelImportModal.tsx`
- API: `/src/app/api/kpi/import/route.ts` — POST multipart/form-data
- Parse Excel server-side using `exceljs` or `xlsx`
- Matching: compare Excel column headers to parameter codes/names
- Preview response: `{ matched: [{row, paramId, value}], unmatched: [{row, reason}] }`
- On confirm: bulk insert matched values
- Max file size: 10MB (configurable)
- Expected columns: at minimum "parameter_code" or "parameter_name" + "value" + "period"

### Depends On
- Story 4.2 (parameters exist for matching)

### References
- [Source: product-brief.md#Solution — Excel import]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Implementation Plan
- Created Zod validation schemas for import preview metadata, confirm rows, and confirm request
- Created ExcelJS-based parsing service that maps column headers via flexible aliases (parameter_code, code, kpi_code, etc.)
- Created parameter matching logic: code match first (exact, case-insensitive), then name match
- Created duplicate detection using existing findByParamNodePeriod repository method
- Created POST /api/kpi/import preview endpoint (multipart/form-data, returns matched/unmatched/duplicate rows)
- Created POST /api/kpi/import/confirm endpoint (JSON body, bulk inserts with sourceType='import')
- Created 3-step ExcelImportModal: upload → preview → result
- Integrated Import Excel button into KPI Console page header
- Wrote 44 tests across 4 test files (schemas, service, 2 API routes)

### Debug Log References

### Completion Notes List
- **Zod schemas**: importPreviewMetadataSchema (nodeId + periodId), importConfirmRowSchema (rowIndex + paramId + value/valueText/unit), importConfirmSchema (nodeId + periodId + filename + rows[]).
- **Excel parsing**: ExcelJS reads first worksheet, maps headers via COLUMN_ALIASES dict (supports parameter_code, param_code, code, kpi_code, parameter_name, name, indicator, metric, value, amount, unit, uom). Validates presence of code/name column + value column. Skips empty rows.
- **Parameter matching**: loadParameterIndex() loads all active platform parameters (tenantId IS NULL), builds byCode and byName Maps keyed by lowercase. Match priority: code > name.
- **Duplicate detection**: Each matched row checked against existing kpi_values via kpiRepository.findByParamNodePeriod(). Duplicates reported with current value in error message.
- **Confirm import**: Each row inserted individually via kpiRepository.insert() with sourceType='import', sourceRef=filename. Failed rows logged but don't abort other rows.
- **Audit**: Confirm endpoint returns _audit metadata with entityType='kpi_import', capturing filename, row counts, and valueIds.
- **UI**: ExcelImportModal has 3 steps: (1) file upload + node/period selectors, (2) preview table with checkboxes for matched rows + status badges + color-coded backgrounds, (3) result summary with success/failure counts.
- **Testing**: 44 new tests — 12 schema tests, 15 service tests (preview + confirm), 8 preview route tests, 9 confirm route tests. Full suite: 903 tests, 0 regressions.

### File List
- greenmeter/src/schemas/kpiImport.ts (new — Zod schemas for import preview and confirm)
- greenmeter/src/schemas/kpiImport.test.ts (new — 12 schema validation tests)
- greenmeter/src/services/excelImportService.ts (new — Excel parsing, parameter matching, duplicate detection, bulk import)
- greenmeter/src/services/excelImportService.test.ts (new — 15 service unit tests)
- greenmeter/src/app/api/kpi/import/route.ts (new — POST preview endpoint, multipart/form-data)
- greenmeter/src/app/api/kpi/import/route.test.ts (new — 8 preview API tests)
- greenmeter/src/app/api/kpi/import/confirm/route.ts (new — POST confirm endpoint, JSON body)
- greenmeter/src/app/api/kpi/import/confirm/route.test.ts (new — 9 confirm API tests)
- greenmeter/src/components/console/ExcelImportModal.tsx (new — 3-step import modal component)
- greenmeter/src/app/(dashboard)/console/page.tsx (modified — added Import Excel button + ExcelImportModal)
- greenmeter/src/db/repositories/parameterRepository.ts (modified — added findAllForMatching method for import matching)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all 44 tests passing, full suite 903 tests pass with 0 regressions
- 2026-05-07: Status changed to `review` — all 9 code review patches applied (+ manual-map feature), 45 tests passing, no regressions
- 2026-05-07: Status changed to `complete` — human review approved, all 6 acceptance criteria verified
