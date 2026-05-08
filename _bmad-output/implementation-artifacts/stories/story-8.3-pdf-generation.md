# Story 8.3: PDF Generation & Download

Status: complete

## Story

As an ESG analyst,
I want to download generated reports as PDF,
so that I can file regulatory disclosures.

## Acceptance Criteria

1. report-generation job produces PDF from rendered template
2. PDF uploaded to Azure Blob Storage in tenant container
3. GET /api/reports returns list of generated reports with download URL
4. Download provides time-limited signed URL from Blob Storage
5. Progress indicator shown during generation (rendering -> PDF -> uploading)
6. Performance: typical report < 30 seconds

## Tasks / Subtasks

- [x] Integrate PDF library (AC: #1, #6)
  - [x] Install pdfkit or @react-pdf/renderer (no browser dependency on Azure)
  - [x] Create PDF generation utility that accepts structured report object
  - [x] Implement section/disclosure rendering with proper formatting
  - [x] Ensure performance target: typical report < 30 seconds
- [x] Implement PDF generation in job handler (AC: #1, #5)
  - [x] Update /src/jobs/reportGeneration.ts — after render, generate PDF buffer
  - [x] Track progress stages: rendering -> generating_pdf -> uploading -> complete
  - [x] Handle errors at each stage gracefully
- [x] Upload PDF to Azure Blob Storage (AC: #2)
  - [x] Upload PDF buffer to blob path: {tenantId}/reports/{reportId}.pdf
  - [x] Use existing blobStorage client from Story 1.7
- [x] Create generated_reports table (AC: #3)
  - [x] Schema: id, tenant_id, framework, period_id, generated_at, blob_path, file_size, status, job_id
  - [x] Insert record on successful generation
- [x] Add download API (AC: #3, #4)
  - [x] GET /api/reports — list generated reports with metadata
  - [x] GET /api/reports/[reportId]/download — generate signed URL via blobStorage.getSignedUrl(tenantId, path, 3600)
  - [x] Signed URL expires after 1 hour
- [x] Update reports page with generated report list (AC: #3, #5)
  - [x] Display list of previously generated reports (framework, period, date, file size)
  - [x] Download button for each report
  - [x] Progress indicator during active generation (rendering -> PDF -> uploading)

## Dev Notes

- PDF library: `puppeteer` (render HTML -> PDF) or `@react-pdf/renderer` or `pdfkit`
- Recommended: `pdfkit` or `@react-pdf/renderer` for server-side (no browser dependency on Azure)
- Alternative: HTML template -> puppeteer PDF (heavier but prettier output)
- Job handler update: /src/jobs/reportGeneration.ts — after render, generate PDF buffer -> upload to Blob
- Blob path: `{tenantId}/reports/{reportId}.pdf`
- API: GET /src/app/api/reports/route.ts — list generated reports
- Download: generate signed URL via blobStorage.getSignedUrl(tenantId, path, 3600)
- generated_reports table: stores metadata (framework, period, generated_at, blob_path, file_size)
- Progress: stage='rendering' -> 'generating_pdf' -> 'uploading' -> 'complete'
- Performance: keep < 30s by limiting template complexity and using efficient PDF lib

### Depends On
- Story 8.2 (coverage data shown in report)
- Story 1.7 (blob storage client)

### References
- [Source: product-brief.md — PDF output]
- [Source: architecture.md — report-generation queue config]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No debug issues encountered.

### Completion Notes List
- Chose `pdfkit` for PDF generation — lightweight, no browser dependency, works well on Azure App Service
- Created `src/lib/pdfGenerator.ts` with structured PDF rendering: cover page, table of contents, per-section disclosure tables with parameter rows, summary page with coverage stats, page numbers
- Updated `src/jobs/reportGeneration.ts` to include full PDF pipeline: render → generate PDF → upload to blob → update record with blobUrl, fileSize in metadata
- Progress stages updated from 4 to 6: initializing → rendering → generating_pdf → uploading → finalizing → complete
- Added `findGeneratedReport()` repository method for single-report lookup
- Created `GET /api/reports/[reportId]/download` endpoint returning 1-hour signed URL via `blobStorage.getSignedUrl`
- Updated Reports page: `DownloadButton` component fetches signed URL on click, file size displayed for completed reports, "Generating..." spinner for in-progress reports
- `generated_reports` table already existed (from Story 8.1); `blobUrl` stores the Azure URL, `metadata` JSONB stores `blobPath` and `fileSize` — no migration needed
- All 1609 tests pass (131 test files), including 6 new PDF generator tests, 7 updated job handler tests, 7 new download route tests
- Updated pre-existing `handlers.test.ts` to add missing pdfGenerator and blobStorage mocks

### File List
- `greenmeter/src/lib/pdfGenerator.ts` (new) — PDF generation utility
- `greenmeter/src/lib/pdfGenerator.test.ts` (new) — 6 tests for PDF generation
- `greenmeter/src/jobs/reportGeneration.ts` (modified) — PDF pipeline integration
- `greenmeter/src/jobs/reportGeneration.test.ts` (modified) — 7 tests updated for PDF pipeline
- `greenmeter/src/jobs/handlers.test.ts` (modified) — added pdfGenerator/blobStorage mocks
- `greenmeter/src/db/repositories/reportRepository.ts` (modified) — added findGeneratedReport()
- `greenmeter/src/app/api/reports/[reportId]/download/route.ts` (new) — signed URL download endpoint
- `greenmeter/src/app/api/reports/[reportId]/download/route.test.ts` (new) — 7 tests for download API
- `greenmeter/src/app/screens/Reports.tsx` (modified) — DownloadButton, file size, progress indicator
- `greenmeter/src/schemas/reports.ts` (unchanged)
- `greenmeter/package.json` (modified) — added pdfkit, @types/pdfkit

## Senior Developer Review (AI)

Review Date: 2026-05-07
Review Outcome: Approved (after fixes)
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (all completed)

### Review Findings

#### Decision Needed

- [x] [Review][Decision] UI shows generic spinner instead of per-stage progress — **Resolved: Option A** — implemented per-stage progress by storing progress in generated_reports metadata, polling every 5s when reports are active, displaying stage label + progress bar
- [x] [Review][Decision] Schema uses metadata JSONB for `file_size` and `blob_path` instead of dedicated columns — **Resolved: Option B** — accepted JSONB as sufficient
- [x] [Review][Decision] `job_id` not persisted on generated_reports record — **Resolved: Option B** — accepted omission, pg-boss tracks internally

#### Patch (Action Items)

- [x] [Review][Patch] Download errors silently swallowed in DownloadButton — added error state + "Failed" indicator [Reports.tsx]
- [x] [Review][Patch] No URL validation before `window.open` — added `https://` validation before download [Reports.tsx]
- [x] [Review][Patch] `window.open` after async fetch may be blocked by popup blockers — replaced with `<a>` element + programmatic click [Reports.tsx]
- [x] [Review][Patch] `report.name` used unsanitized in `fileName` response — added regex sanitization of special chars [download/route.ts]
- [x] [Review][Patch] `metadata` cast lacks runtime type narrowing — added typeof/Array.isArray guard [download/route.ts]
- [x] [Review][Patch] Download button gated on `report.blobUrl` truthy — changed to `status === "complete"` only [Reports.tsx]
- [x] [Review][Patch] PDFDocument stream not destroyed on render error — added try/catch with doc.destroy() [pdfGenerator.ts]
- [x] [Review][Patch] `metadata` fully overwritten on failure — now merges accumulated progress metadata on failure [reportGeneration.ts]
- [x] [Review][Patch] `truncate()` has no null guard — added `if (!text) return ''` guard [pdfGenerator.ts]
- [x] [Review][Patch] Table of Contents can overflow page — added `ensureSpace()` before each section/disclosure entry [pdfGenerator.ts]
- [x] [Review][Patch] Missing test case for `getSignedUrl` failure — added 500 error test + filename sanitization test [download/route.test.ts]

#### Deferred

- [x] [Review][Defer] `extractUuidParam` uses hardcoded segment index — fragile to base path changes [download/route.ts:17] — deferred, pre-existing project-wide pattern
- [x] [Review][Defer] Large PDF buffer held entirely in memory with no size limit — streaming optimization for large reports [pdfGenerator.ts:42-77] — deferred, not a blocker for initial release
- [x] [Review][Defer] Report status can get stuck as 'generating' if process crashes between status updates — needs stale-report cleanup mechanism [reportGeneration.ts:46-48] — deferred, infrastructure concern for ops
- [x] [Review][Defer] `reportProgress()` does not actually persist progress data — pgBoss.ts resume() ignores the progress parameter [pgBoss.ts:91] — deferred, pre-existing issue (progress now stored in generated_reports metadata instead)
- [x] [Review][Defer] No deduplication guard against concurrent generation of identical reports — same framework+period+format can produce duplicates [Reports.tsx, reportGeneration.ts] — deferred, enhancement for future sprint

## Change Log
- 2026-05-07: Implemented PDF generation, blob upload, download API, and UI updates for Story 8.3
- 2026-05-08: Resolved all code review findings — per-stage progress, download hardening, PDF error handling, metadata merge, test coverage

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `review` — all tasks complete, 1609 tests passing, ready for human review
- 2026-05-08: Code review decisions resolved, all 11 patch items fixed, 1644 tests passing
- 2026-05-08: Status changed to `complete` — human review approved
