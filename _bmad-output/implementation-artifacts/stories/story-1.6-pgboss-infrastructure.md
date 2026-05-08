# Story 1.6: Background Job Infrastructure (pg-boss)

Status: complete

## Story

As a developer,
I want a reliable background job system using pg-boss,
so that long-running operations execute asynchronously with progress tracking and retry logic.

## Acceptance Criteria

1. pg-boss installed and `/src/lib/pgBoss.ts` initializes the client
2. On app start, pg-boss connects and creates its schema tables
3. Job handlers registered in `/src/jobs/index.ts` for all queue types
4. Jobs return standard shape: `{ success: boolean, result?: T, error?: string }`
5. Failed jobs retry with exponential backoff per queue config
6. Progress reporting: `{ stage, progress (0-100), message }` queryable by job ID
7. Queue configurations match architecture spec (concurrency, retries per queue)

## Tasks / Subtasks

- [x] Task 1: Install pg-boss (AC: #1)
  - [x] `npm install pg-boss`
- [x] Task 2: Create pg-boss client (AC: #1, #2)
  - [x] `/src/lib/pgBoss.ts`
  - [x] Initialize with DATABASE_URL
  - [x] Export `getBoss()` singleton
  - [x] Start boss on app initialization
- [x] Task 3: Create job registry (AC: #3)
  - [x] `/src/jobs/index.ts` — register all queue handlers
  - [x] Create placeholder handler files:
    - [x] `/src/jobs/extractionPipeline.ts`
    - [x] `/src/jobs/metricMapping.ts`
    - [x] `/src/jobs/scoreRecompute.ts`
    - [x] `/src/jobs/reportGeneration.ts`
    - [x] `/src/jobs/apiSync.ts`
    - [x] `/src/jobs/llmRecommendations.ts`
  - [x] Each handler exports the job function (placeholder implementation)
- [x] Task 4: Configure queues (AC: #5, #7)
  - [x] extraction-pipeline: concurrency 2, retries 3, exponential backoff
  - [x] metric-mapping: concurrency 3, retries 3
  - [x] score-recompute: concurrency 5, retries 1 (immediate)
  - [x] report-generation: concurrency 2, retries 2
  - [x] api-sync: concurrency 1, retries 3
  - [x] llm-recommendations: concurrency 1, retries 1
- [x] Task 5: Progress tracking utility (AC: #6)
  - [x] Helper to emit progress: `reportProgress(queueName, jobId, { stage, progress, message })`
  - [x] API to query progress: exposed via `getJobStatus(queueName, jobId)`

## Dev Notes

### pg-boss Initialization Pattern
```typescript
import PgBoss from 'pg-boss'

let boss: PgBoss | null = null

export async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss(process.env.DATABASE_URL!)
    await boss.start()
  }
  return boss
}
```

### Job Handler Pattern
```typescript
// /src/jobs/extractionPipeline.ts
import type PgBoss from 'pg-boss'

export async function handleExtractionPipeline(job: PgBoss.Job<ExtractionJobData>) {
  try {
    // ... implementation in later stories
    return { success: true, result: { extractionId: '...' } }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Queue Config (from architecture)
| Queue | Priority | Concurrency | Retry |
|---|---|---|---|
| extraction-pipeline | normal | 2 per tenant | 3, exponential |
| api-sync | low | 1 per integration | 3 |
| llm-recommendations | low | 1 global | 1 |
| report-generation | normal | 2 per tenant | 2 |
| score-recompute | high | 5 global | immediate |
| metric-mapping | normal | 3 global | 3 |

### pg-boss requires PostgreSQL SKIP LOCKED — supported in PG 16 (our target)

### Critical: pg-boss uses its own schema in the database
- Creates tables like `pgboss.job`, `pgboss.schedule`, etc.
- This is automatic on first `start()`

### Depends On
- Story 1.1 (PostgreSQL database must be accessible)

### References
- [Source: architecture.md#Starter Template Evaluation — pg-boss Selected]
- [Source: architecture.md#API & Communication Patterns — Background job types]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- pg-boss v12.18.2 uses named export `{ PgBoss }` not default export
- `Job<T>` type imported directly from `pg-boss` (not `PgBoss.Job<T>`)
- WorkHandler signature receives `Job<T>[]` (array), not single job
- Work options use `localConcurrency` (not `teamSize`/`teamConcurrency`)
- `resume(queueName, jobId)` and `getJobById(queueName, jobId)` require queue name as first arg

### Completion Notes List
- pg-boss v12.18.2 installed with all TypeScript types included
- `getBoss()` singleton pattern with lazy initialization and DATABASE_URL validation
- Queue config (`QUEUE_CONFIG`) defines all 6 queues matching architecture spec exactly
- `registerAllJobs()` wires handlers with correct concurrency per queue
- `submitJob()` utility applies retry config from QUEUE_CONFIG automatically
- `getJobStatus()` enables progress querying by queue name + job ID
- `reportProgress()` uses pg-boss `resume()` to update job state with progress data
- `stopBoss()` provides graceful shutdown for app lifecycle
- All handlers follow standard `JobResult<T>` shape: `{ success, result?, error? }`
- 26 new tests passing (pgBoss client: 13, job registry: 7, handlers: 6)
- Zero regressions on existing 146 tests
- Zero TypeScript errors (excluding pre-existing unrelated modules)

### File List
- `src/lib/pgBoss.ts` — pg-boss singleton client, QUEUE_CONFIG, types, utilities
- `src/lib/pgBoss.test.ts` — 13 unit tests for client, progress, stop, config
- `src/jobs/index.ts` — job registry: registerAllJobs, submitJob, getJobStatus
- `src/jobs/index.test.ts` — 7 tests for registration, submission, status
- `src/jobs/handlers.test.ts` — 6 tests for all handler return shapes
- `src/jobs/extractionPipeline.ts` — extraction pipeline handler (placeholder)
- `src/jobs/metricMapping.ts` — metric mapping handler (placeholder)
- `src/jobs/scoreRecompute.ts` — score recompute handler (placeholder)
- `src/jobs/reportGeneration.ts` — report generation handler (placeholder)
- `src/jobs/apiSync.ts` — API sync handler (placeholder)
- `src/jobs/llmRecommendations.ts` — LLM recommendations handler (placeholder)

## Change Log
- 2026-05-05: Implemented all tasks — pg-boss client, job registry, 6 handlers, queue config, progress tracking

## Status Log
- 2026-05-05: Status changed to `in-progress` — picked up for implementation
- 2026-05-05: Status changed to `review` — all tasks complete, 26 tests passing, all ACs satisfied
- 2026-05-05: Status changed to `complete` — human review approved
