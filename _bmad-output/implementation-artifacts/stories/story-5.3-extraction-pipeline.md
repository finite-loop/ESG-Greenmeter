# Story 5.3: Extraction Pipeline Job (OCR → LLM → Parse)

Status: complete

## Story

As the system,
I want to process uploaded PDFs through Document Intelligence and LLM,
so that peer reports become structured metric data.

## Acceptance Criteria

1. Job handler: download PDF → Document Intelligence OCR → LLM extraction → parse JSON
2. raw_extractions record created (immutable full payload)
3. extracted_metrics rows parsed from JSON
4. Standard-specific prompts used (BRSR, ESRS, GRI)
5. Progress reported per stage (ocr, llm, parsing, complete)
6. On failure after retries: status='failed', error logged
7. metric_count updated on completion

## Tasks / Subtasks

- [x] Task 1: Implement extractionPipeline job handler (AC: #1, #5, #6)
  - [x] Create /src/jobs/extractionPipeline.ts replacing placeholder from 1.6
  - [x] Implement download stage: fetch PDF from Azure Blob
  - [x] Implement OCR stage: call Document Intelligence client
  - [x] Implement LLM stage: construct prompt and call LLM client
  - [x] Implement parsing stage: parse LLM JSON response
  - [x] Report progress per stage via job metadata
  - [x] Handle failures with retries, set status='failed' and log error on exhaustion
- [x] Task 2: Integrate Document Intelligence + LLM clients (AC: #1, #4)
  - [x] Wire Document Intelligence client for OCR
  - [x] Load standard-specific prompts (BRSR, ESRS, GRI)
  - [x] Construct prompt with OCR text and standard template
  - [x] Call LLM client and receive structured JSON
- [x] Task 3: Parse LLM JSON into extracted_metrics rows (AC: #2, #3, #7)
  - [x] Create raw_extractions record with full immutable payload
  - [x] Parse JSON into individual metric rows
  - [x] Insert extracted_metrics with section, topic, metric_name, metric_value, parsed_value
  - [x] Clean numeric values: "1,60,000" → 160000, "NIL" → null
  - [x] Update metric_count on raw_extractions record

### Review Findings

- [x] [Review][Patch] Wrap DB writes in transaction — raw_extractions + extracted_metrics + document status update are 3 separate ops; crash between them leaves inconsistent state [extractionPipeline.ts:389-448] — FIXED: wrapped in db.transaction()
- [x] [Review][Patch] Batch large metric inserts — single INSERT with ~11 cols/row hits PG param limit (~65535) at ~5,958 metrics; batch in chunks of 500 [extractionPipeline.ts:435] — FIXED: batch insert with METRIC_INSERT_BATCH_SIZE=500
- [x] [Review][Patch] Increase LLM maxTokens — 4096 too low for large ESG reports with hundreds of metrics; truncated JSON causes parse failure [extractionPipeline.ts:363] — FIXED: increased to 16384
- [x] [Review][Patch] Add defensive check on extractionRows[0] — insert returning could theoretically be empty [extractionPipeline.ts:411] — FIXED: added null check with descriptive error
- [x] [Review][Patch] Make progress reporting best-effort — reportProgress failure should not kill the pipeline job [extractionPipeline.ts:39-47] — FIXED: wrapped in try/catch with logger.warn
- [x] [Review][Patch] Guard safeStr against object values — String({}) produces "[object Object]" which would be stored as metric data [extractionPipeline.ts:134-138] — FIXED: return null for typeof object
- [x] [Review][Patch] Re-set tenant context in error handler or guard DB update — if setTenantContext fails, error handler's DB update runs without RLS context [extractionPipeline.ts:490-498] — FIXED: re-call setTenantContext in error handler
- [x] [Review][Defer] Unbounded OCR text sent to LLM — no truncation or chunking for very large documents; separate feature [extractionPipeline.ts:362] — deferred, future enhancement
- [x] [Review][Defer] European locale number parsing — period-as-thousands-separator (e.g. "1.000.000,50") not handled by parseNumericValue [extractionPipeline.ts:55-84] — deferred, pre-existing design scope

## Dev Notes

- Handler: /src/jobs/extractionPipeline.ts (replace placeholder from 1.6)
- Pipeline stages: download → OCR → prompt construction → LLM call → JSON parse → insert metrics
- Extraction prompts: /docs/extraction-prompts/ExtractionPrompt_BRSR.txt, _ESRS.txt, _GRI.txt
- raw_extractions.raw_payload = full JSON from LLM (NEVER update this after insert)
- extracted_metrics: one row per metric in the JSON, with section, topic, metric_name, metric_value, parsed_value
- parsed_value: clean numeric extraction from strings like "1,60,000" → 160000, "NIL" → null
- Status flow: pending_mapping → (after mapping in 5.4) → mapped/partially_mapped

### Depends On
- Story 5.2 (documents uploaded)
- Story 1.7 (Document Intelligence + LLM clients)
- Story 1.6 (pg-boss)

### References
- [Source: storage-schema-design.md#Raw Extraction Store]
- [Source: storage-schema-design.md#Extracted Metrics]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Replaced placeholder `extractionPipeline.ts` with full pipeline implementation: download → OCR → LLM → parse → insert
- Created `extractionPrompts.ts` with standard-specific system prompts for BRSR, ESRS, and GRI
- Pipeline reports progress at 6 stages: initializing (0%), downloading (10%), ocr (25%), llm (50%), parsing (75%), complete (100%)
- `parseNumericValue()` handles Indian formatting ("1,60,000"), currency symbols, percentages, parenthesized negatives, and sentinel values (NIL, NA, N/A)
- `extractJsonFromResponse()` strips markdown fences and `<json_output>` XML tags from LLM output
- `parseLlmOutput()` normalizes BRSR (principles → indicators), ESRS (standards → metrics), and GRI (gri_standards → disclosures) into a common metric shape
- On failure: document status set to 'failed' with error message, error logged via structured logger
- On success: document status set to 'completed', raw_extractions record created (immutable), extracted_metrics rows inserted with parsed_value
- Wrote 29 unit tests covering: numeric parsing (12 cases), JSON extraction (4 cases), LLM output parsing for all 3 standards (5 cases), full pipeline happy path (4 cases), failure scenarios (4 cases)
- Updated handlers.test.ts to remove placeholder smoke test (now replaced by comprehensive test suite in extractionPipeline.test.ts)
- All 807 tests pass across 67 test files — zero regressions

### File List
- `greenmeter/src/jobs/extractionPipeline.ts` — modified (replaced placeholder with full implementation)
- `greenmeter/src/jobs/extractionPrompts.ts` — new (standard-specific LLM extraction prompts)
- `greenmeter/src/jobs/extractionPipeline.test.ts` — new (29 unit tests for pipeline)
- `greenmeter/src/jobs/handlers.test.ts` — modified (removed placeholder extraction test, added comment)

## Change Log
- 2026-05-06: Full extraction pipeline implementation — download → OCR → LLM → parse → insert metrics
- 2026-05-07: Code review patches applied — 7 findings fixed (transaction wrapping, batch insert, maxTokens increase, defensive checks, best-effort progress, safeStr guard, tenant context in error handler)

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all tests passing (807/807, 67 files, 0 regressions)
- 2026-05-06: Status changed to `review` — implementation complete, ready for human review
- 2026-05-07: Code review complete — 7 patches applied, 2 deferred, 5 dismissed. All 888 tests passing.
- 2026-05-07: Status changed to `complete` — human review approved
