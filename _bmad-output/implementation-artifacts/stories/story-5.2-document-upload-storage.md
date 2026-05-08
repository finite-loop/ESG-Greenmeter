# Story 5.2: Document Upload & Storage

Status: complete

## Story

As an ESG analyst,
I want to upload peer sustainability reports (PDFs) for extraction,
so that documents are stored and queued for processing.

## Acceptance Criteria

1. Upload UI at /settings/documents accepts PDF with metadata (peer, standard, fiscal year)
2. File stored in Azure Blob Storage under tenant-scoped path
3. POST /api/extraction/trigger enqueues extraction-pipeline job
4. Max file size enforced (50MB default)
5. Documents list shows status: pending, processing, completed, failed

## Tasks / Subtasks

- [x] Task 1: Create DocumentUpload component (AC: #1, #4)
  - [x] Build upload form with PDF file input
  - [x] Add metadata fields: peer selector, standard dropdown, fiscal year picker
  - [x] Enforce 50MB max file size on client side
  - [x] Show upload progress indicator
- [x] Task 2: Create upload API endpoint (AC: #2, #4)
  - [x] POST /api/extraction route handling multipart file upload
  - [x] Validate file size server-side (50MB limit)
  - [x] Store file in Azure Blob at `{tenantId}/documents/{extractionId}/{filename}`
  - [x] Create document metadata record in database
- [x] Task 3: Create trigger endpoint (AC: #3)
  - [x] POST /api/extraction/trigger route
  - [x] Enqueue extraction-pipeline job via pg-boss with document ID
  - [x] Update document status to 'pending'
- [x] Task 4: Create documents list page (AC: #5)
  - [x] Build /settings/documents page
  - [x] Display documents table with status column
  - [x] Show status badges: pending, processing, completed, failed

## Dev Notes

- Page: /src/app/(dashboard)/settings/documents/page.tsx
- Component: /src/components/extraction/DocumentUpload.tsx
- Upload API: /src/app/api/extraction/route.ts (POST — upload file)
- Trigger API: /src/app/api/extraction/trigger/route.ts (POST — enqueue job with doc ID)
- Blob path: `{tenantId}/documents/{extractionId}/{filename}`
- Store document metadata in a documents table or use raw_extractions directly
- Status tracking via pg-boss job status

### Depends On
- Story 5.1 (peer org must exist to associate doc)
- Story 1.7 (blob client)
- Story 1.6 (pg-boss)

### References
- [Source: architecture.md#Integration Points — Azure Blob Storage]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Implementation Plan
- Created `documents` table in DB schema (extraction.ts) with full metadata fields
- Created document Zod validation schemas (documentUploadSchema, documentListFilterSchema)
- Created document repository with CRUD operations and peer name join
- Created document service with upload, triggerExtraction, list, getById methods
- Created POST /api/extraction route for multipart file upload + GET for listing
- Created POST /api/extraction/trigger route to enqueue pg-boss extraction jobs
- Created DocumentUpload component with file picker, peer/standard/year selectors, progress bar
- Replaced placeholder /settings/documents page with full document queue UI
- Updated rawExtractions.docId to reference documents table FK
- Wrote comprehensive tests for schemas, service, and both API routes (45 tests total)

### Debug Log References

### Completion Notes List
- **Documents table**: Added to extraction.ts schema with columns: docId (PK), tenantId, peerId (FK to peers), standard, fiscalYear, filename, contentType, fileSize (bigint), blobPath, blobUrl, status, jobId, errorMessage, uploadedBy, uploadedAt, updatedAt. Status enum: pending/processing/completed/failed.
- **rawExtractions.docId FK**: Updated the existing nullable docId column to reference the new documents table, linking extractions back to their source document.
- **Validation**: documentUploadSchema validates peerId (UUID), standard (BRSR|ESRS|GRI), fiscalYear (non-empty). documentListFilterSchema extends pagination with optional status/peerId/standard filters.
- **Repository layer**: documentRepository provides create, findById, findAllByTenant (with LEFT JOIN to peer_organisations for peer name), and updateStatus operations.
- **Service layer**: documentService.upload validates file (PDF-only, 50MB max), verifies peer exists, uploads to blob storage at tenant-scoped path, creates DB record. documentService.triggerExtraction validates pending status, enqueues extraction-pipeline job via pg-boss, updates status to processing.
- **Upload API (POST /api/extraction)**: Handles multipart/form-data with file + metadata fields. Uses withApiHandler for auth/tenant/role/audit chain. Roles: admin, analyst.
- **List API (GET /api/extraction)**: Returns paginated document list with peer names. Supports status, peerId, standard filters.
- **Trigger API (POST /api/extraction/trigger)**: Accepts JSON body with docId. Validates UUID, delegates to service for job enqueue.
- **DocumentUpload component**: File picker with drag-style UI, peer selector (React Query), standard dropdown, fiscal year input, progress bar. Client-side PDF and size validation.
- **Documents page**: Replaced placeholder with full document queue. Table with filename, peer, standard, fiscal year, size, status badges, upload date, and trigger action button. Status filter dropdown.
- **Testing**: 45 new tests across 4 test files. Full test suite: 604 tests, 0 regressions, 0 failures.

### File List
- greenmeter/src/db/schema/extraction.ts (modified — added `documents` table, updated rawExtractions.docId FK, added peerId .notNull())
- greenmeter/src/schemas/document.ts (new — upload and list filter Zod schemas)
- greenmeter/src/schemas/document.test.ts (new — 11 schema validation tests)
- greenmeter/src/db/repositories/documentRepository.ts (new — CRUD operations + atomic CAS updateStatusIfCurrent)
- greenmeter/src/services/documentService.ts (new — business logic with blob cleanup, filename sanitization, atomic trigger)
- greenmeter/src/services/documentService.test.ts (new — 13 service unit tests)
- greenmeter/src/app/api/extraction/route.ts (new — GET list + POST upload)
- greenmeter/src/app/api/extraction/route.test.ts (new — 14 API route tests)
- greenmeter/src/app/api/extraction/trigger/route.ts (new — POST trigger extraction, removed unused _audit.action field)
- greenmeter/src/app/api/extraction/trigger/route.test.ts (new — 7 trigger API tests)
- greenmeter/src/components/extraction/DocumentUpload.tsx (new — upload form component)
- greenmeter/src/app/(dashboard)/settings/documents/page.tsx (modified — replaced placeholder with full page)
- greenmeter/scripts/setup-rls.ts (modified — added 'documents' to tenantScopedTables)

### Review Findings

- [x] [Review][Patch] Orphaned blob on DB failure — added try/catch around DB insert with blob deletion on failure. [documentService.ts]
- [x] [Review][Patch] Race condition on concurrent trigger — added atomic `updateStatusIfCurrent` CAS method; trigger uses it to atomically claim pending -> processing. [documentRepository.ts, documentService.ts]
- [x] [Review][Patch] Filename not sanitized for blob path — added `sanitizeFilename()` helper that strips path separators, null bytes, and special chars. [documentService.ts]
- [x] [Review][Patch] Blob path uses docId — pre-generate docId with `randomUUID()`, use for both blob path and DB record. [documentService.ts]
- [x] [Review][Patch] Job enqueued after status claim — atomic CAS claims doc first, then submits job, reverts on failure. [documentService.ts]
- [x] [Review][Patch] peerId notNull mismatch — added `.notNull()` to `documents.peerId` column in schema. [extraction.ts]
- [x] [Review][Patch] RLS policy for documents table — added `'documents'` to `tenantScopedTables` in setup-rls.ts. [setup-rls.ts]
- [x] [Review][Defer] Full file buffered in memory — entire uploaded file read into memory via formData(). Mitigated by 50MB cap; standard Next.js pattern. [documentService.ts:17] — deferred, standard pattern
- [x] [Review][Defer] Fake progress bar — upload progress jumps 0→10→80→100 rather than tracking real upload. fetch() API doesn't support upload progress natively. [DocumentUpload.tsx:48-58] — deferred, fetch API limitation
- [x] [Review][Defer] No pagination UI controls — page hardcodes pageSize=50 with no next/prev buttons. AC#5 only requires showing status list. [page.tsx:71] — deferred, enhancement not in AC
- [x] [Review][Defer] Internal fields exposed in API response — blobPath, tenantId, uploadedBy returned from API but unused by client. Not a vulnerability (user is authenticated) but unnecessary data exposure. [route.ts:27-30] — deferred, response DTO enhancement

## Change Log
- 2026-05-06: Implemented document upload, storage, trigger, and list functionality (Story 5.2)
- 2026-05-06: Applied 7 code review patches — orphaned blob cleanup, atomic CAS for trigger, filename sanitization, docId-based blob path, reordered job/status, peerId notNull, RLS policy for documents table

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all 45 tests passing, full suite 604 tests pass with 0 regressions
- 2026-05-06: Status changed to `review` — all ACs met, DoD validated, ready for human review
- 2026-05-06: Code review patches applied — 7 patches fixed, 4 deferred, 15 dismissed. 48 tests pass, 648 total suite (0 regressions from patches)
- 2026-05-06: Status changed to `complete` — human review approved, all 5 ACs verified
