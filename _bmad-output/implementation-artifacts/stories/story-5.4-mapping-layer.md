# Story 5.4: Mapping Layer (Fuzzy + LLM + Manual)

Status: complete

## Story

As the system,
I want extracted metrics automatically mapped to known parameters using multi-stage matching,
so that peer data becomes structured without manual effort.

## Acceptance Criteria

1. metric-mapping job processes extracted_metrics after extraction completes
2. Cascade: exact alias → pattern rule → fuzzy trigram → LLM classification
3. Confidence > 85: auto-map → create peer_kpi_values
4. Confidence 60-85: auto_mapped + flagged for review
5. Confidence < 60: unmapped → inserted into unmapped_metrics + review queue
6. raw_extractions.mapped_count updated after mapping
7. mappingService handles the cascade logic

## Tasks / Subtasks

- [x] Task 1: Implement mappingService (AC: #2, #7)
  - [x] Create /src/services/mappingService.ts
  - [x] Implement mapMetric(extractedMetric) returning {paramId, confidence, method}
  - [x] Stage 1: exact alias match against metric_aliases.alias_text
  - [x] Stage 2: pattern rule matching
  - [x] Stage 3: fuzzy trigram comparison against kpi_parameters.name + metric_aliases
  - [x] Stage 4: LLM classification with candidates prompt
- [x] Task 2: Implement metricMapping job handler (AC: #1, #6)
  - [x] Replace placeholder in /src/jobs/metricMapping.ts
  - [x] Process all extracted_metrics for a given extraction
  - [x] Call mappingService.mapMetric for each metric
  - [x] Update raw_extractions.mapped_count on completion
- [x] Task 3: Implement fuzzy match utility (AC: #2)
  - [x] Implemented trigram-based comparison (no external dependency)
  - [x] Compare against kpi_parameters.name and metric_aliases.alias_text
  - [x] Return confidence score 0-100
- [x] Task 4: Implement LLM classification prompt (AC: #2)
  - [x] Construct prompt with metric name, section, standard, and candidate parameters
  - [x] Parse LLM JSON response for paramId + confidence + pillarGuess + categoryGuess
- [x] Task 5: Route results by confidence threshold (AC: #3, #4, #5)
  - [x] Confidence >= 85: auto-map, create peer_kpi_values
  - [x] Confidence 60-84: auto_mapped, flag for review
  - [x] Confidence < 60: insert into unmapped_metrics + review queue

## Dev Notes

- Service: /src/services/mappingService.ts — mapMetric(extractedMetric) returns {paramId, confidence, method}
- Job: /src/jobs/metricMapping.ts — process all extracted_metrics for an extraction
- Fuzzy matching: use string-similarity or trigram-based comparison against kpi_parameters.name + metric_aliases.alias_text
- LLM mapping prompt: "Given this metric name '{name}' from section '{section}', which of these parameters does it match? {candidates}" → returns paramId + confidence
- Thresholds configurable in tenant_config (default: auto=85, review=60)
- peer_kpi_values: created when confidence > threshold, links to source_extraction_id + source_metric_id
- unmapped_metrics: retained for MDS analysis even if not mappable

### Depends On
- Story 5.3 (extracted_metrics must exist)
- Story 4.1 (parameters as mapping targets)

### References
- [Source: storage-schema-design.md#Mapping Configuration — algorithm steps]
- [Source: storage-schema-design.md#Peer KPI Values]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Implemented pure TypeScript trigram similarity (no external dependency needed)
- LLM classification validates returned paramId against candidate list
- Peer KPI values use onConflictDoNothing to handle duplicate (tenant, peer, param, fiscalYear) gracefully
- Extraction status transitions: pending_mapping → mapped | partially_mapped | failed
- Updated handlers.test.ts to accommodate the new non-placeholder implementation

### File List
- greenmeter/src/services/mappingService.ts (new)
- greenmeter/src/services/mappingService.test.ts (new — 37 tests)
- greenmeter/src/jobs/metricMapping.ts (modified — replaced placeholder with full implementation)
- greenmeter/src/jobs/metricMapping.test.ts (new — 8 tests)
- greenmeter/src/jobs/handlers.test.ts (modified — updated handleMetricMapping test for non-placeholder handler)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all 1026 tests passing (45 new tests for mapping layer)
- 2026-05-07: Code review complete — 5 patches applied (ReDoS guard, tenant context in tx, unmapped cleanup on retry, cascade fuzzy vs LLM comparison, empty name guard), 3 deferred, 6 dismissed. All 1037 tests passing.
- 2026-05-07: Status changed to `review` — ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
