# Story 1.7: External Service Clients (Blob Storage, Document Intelligence, LLM)

Status: complete

## Story

As a developer,
I want typed client abstractions for Azure Blob Storage, Azure Document Intelligence, and the LLM provider,
so that all external integrations go through a consistent interface that can be swapped or mocked.

## Acceptance Criteria

1. `/src/lib/blobStorage.ts` provides tenant-scoped upload/download/delete/getUrl methods
2. `/src/lib/documentIntelligence.ts` accepts PDF buffer and returns structured text
3. `/src/lib/llm.ts` provides a provider-agnostic interface for prompt completion
4. LLM client supports configurable endpoint (Azure OpenAI or localhost)
5. All clients throw typed AppError on failure with PROCESSING_ERROR code
6. All clients can be instantiated with test/mock configuration

## Tasks / Subtasks

- [x] Task 1: Install Azure SDKs (AC: #1, #2)
  - [x] `npm install @azure/storage-blob @azure/ai-form-recognizer`
- [x] Task 2: Create Blob Storage client (AC: #1)
  - [x] `/src/lib/blobStorage.ts`
  - [x] `upload(tenantId, path, buffer, contentType)` → URL
  - [x] `download(tenantId, path)` → Buffer
  - [x] `delete(tenantId, path)` → void
  - [x] `getSignedUrl(tenantId, path, expiresIn)` → time-limited URL
  - [x] Container naming: `tenant-{tenantId}` or subfolder pattern
- [x] Task 3: Create Document Intelligence client (AC: #2)
  - [x] `/src/lib/documentIntelligence.ts`
  - [x] `extractText(pdfBuffer: Buffer)` → structured text (layout model)
  - [x] Handle multi-page PDFs
  - [x] Return extracted text organized by page
- [x] Task 4: Create LLM client (AC: #3, #4)
  - [x] `/src/lib/llm.ts`
  - [x] Interface: `complete(prompt: string, input: string, options?)` → string
  - [x] Support Azure OpenAI (API key + endpoint)
  - [x] Support localhost/self-hosted (configurable base URL)
  - [x] Provider selected via env var: LLM_PROVIDER=azure|local
- [x] Task 5: Error handling (AC: #5)
  - [x] All clients catch provider errors and throw `AppError('PROCESSING_ERROR', ...)`
  - [x] Include original error details in AppError for logging
- [x] Task 6: Environment variables
  - [x] Add to `.env.example` and `/src/config/env.ts`:
    - AZURE_STORAGE_CONNECTION_STRING
    - AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY
    - LLM_PROVIDER, LLM_ENDPOINT, LLM_API_KEY, LLM_MODEL

### Review Findings

- [x] [Review][Patch] Path traversal via unsanitized `path`/`tenantId` in `getBlobPath` — validate both params against `..`, leading `/`, and non-UUID tenantId [blobStorage.ts:23-25]
- [x] [Review][Patch] No timeout on Document Intelligence `pollUntilDone()` — add `Promise.race` with 2-minute timeout [documentIntelligence.ts:37]
- [x] [Review][Patch] No timeout on LLM `fetch` call — add `AbortSignal.timeout(60_000)` [llm.ts:68]
- [x] [Review][Patch] Unsafe `as` type assertion on `LLM_PROVIDER` — add runtime validation rejecting unknown values [llm.ts:22]
- [x] [Review][Patch] Empty LLM `choices` returns silent empty string — validate response and throw if empty [llm.ts:81]
- [x] [Review][Patch] No size limit on blob download — check `contentLength` before streaming, reject above threshold [blobStorage.ts:53-64]
- [x] [Review][Patch] `expiresInSeconds` not validated — reject zero, negative, NaN, and values above 86400 [blobStorage.ts:88]
- [x] [Review][Patch] Auth header uses `api-key` for local provider — use `Authorization: Bearer` for non-Azure providers [llm.ts:58]
- [x] [Review][Patch] `blobStorage.test.ts` missing `vi.resetModules()` in `beforeEach` — singleton state leaks between tests [blobStorage.test.ts:44]
- [x] [Review][Defer] Clients read `process.env` directly instead of validated `getEnv()` — deferred, architectural refactor
- [x] [Review][Defer] Singleton clients never invalidated on credential rotation — deferred, ops concern
- [x] [Review][Defer] No upload size limit — deferred, will be handled when upload API route is built

## Dev Notes

### Blob Storage Pattern
```typescript
import { BlobServiceClient } from '@azure/storage-blob'

const blobService = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!)

export async function upload(tenantId: string, path: string, buffer: Buffer, contentType: string) {
  const container = blobService.getContainerClient(`documents`)
  const blob = container.getBlockBlobClient(`${tenantId}/${path}`)
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } })
  return blob.url
}
```

### LLM Client Interface
```typescript
export interface LlmClient {
  complete(prompt: string, input: string, options?: { temperature?: number, maxTokens?: number }): Promise<string>
}
```

### Critical: Abstract LLM provider
The architecture requires the LLM to be swappable (D4). The client MUST NOT hardcode Azure OpenAI — use a factory pattern or strategy pattern.

### Depends On
- Story 1.1 (for AppError class defined in 1.4 lib/errors.ts)

### References
- [Source: architecture.md#Integration Points — External Integrations table]
- [Source: architecture.md#Starter Template Evaluation — Document AI, LLM]
- [Source: decisions-log.md#D4 — LLM configurable endpoint]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Installed `@azure/storage-blob` and `@azure/ai-form-recognizer` Azure SDKs
- Created `blobStorage.ts` with tenant-scoped upload/download/delete/getSignedUrl using subfolder pattern (`{tenantId}/{path}` in `documents` container)
- Created `documentIntelligence.ts` with `extractText()` using `prebuilt-layout` model, returns structured `{fullText, pages[{pageNumber, text}]}` format
- Created `llm.ts` with factory pattern (`createLlmClient()`) supporting both Azure OpenAI and local/self-hosted OpenAI-compatible endpoints via `LLM_PROVIDER` env var — satisfies architecture decision D4 for swappable LLM providers
- All three clients throw `AppError(PROCESSING_ERROR, ...)` on failure with original error message included
- All clients fully mockable via constructor injection (mock the SDK imports) — test files demonstrate mocking patterns
- Added all new env vars to `env.ts` schema (optional) and `.env.example`
- 20 new tests total: 5 for blobStorage, 5 for documentIntelligence, 10 for llm
- Full suite passes: 200 tests across 17 files, zero regressions
- Addressed all 9 code review findings:
  - blobStorage: path traversal prevention (UUID validation + `..` / leading `/` rejection), download size limit (500MB), expiresInSeconds validation (1–86400, rejects NaN/zero/negative)
  - documentIntelligence: 2-minute polling timeout via `Promise.race` with proper `clearTimeout` cleanup
  - llm: 60s `AbortSignal.timeout` on fetch, runtime LLM_PROVIDER validation (rejects unknown values), empty choices validation (throws instead of returning empty string), `Authorization: Bearer` for local provider (only `api-key` for Azure)
  - blobStorage.test.ts: already had `vi.resetModules()`, added `getProperties` mock and new validation tests
- Final suite passes: 287 tests across 26 files, zero errors

### Implementation Plan
Implement typed client abstractions for Azure Blob Storage, Azure Document Intelligence, and LLM provider with consistent error handling via AppError.

### File List
- `greenmeter/src/lib/blobStorage.ts` (new)
- `greenmeter/src/lib/blobStorage.test.ts` (new)
- `greenmeter/src/lib/documentIntelligence.ts` (new)
- `greenmeter/src/lib/documentIntelligence.test.ts` (new)
- `greenmeter/src/lib/llm.ts` (new)
- `greenmeter/src/lib/llm.test.ts` (new)
- `greenmeter/src/config/env.ts` (modified — added Azure & LLM env vars)
- `greenmeter/.env.example` (modified — added Azure & LLM env var examples)
- `greenmeter/package.json` (modified — added @azure/storage-blob, @azure/ai-form-recognizer)

## Change Log
- 2026-05-05: Implemented all external service clients (Blob Storage, Document Intelligence, LLM) with tests
- 2026-05-05: Addressed all 9 code review findings — security hardening, timeouts, input validation, auth header correction

## Status Log
- 2026-05-05: Status changed to `in-progress` — picked up for implementation
- 2026-05-05: Status changed to `testing` — all 200 tests passing, zero regressions
- 2026-05-05: Status changed to `review` — all tasks complete, ready for human review
- 2026-05-05: Status changed to `in-progress` — addressing 9 code review findings
- 2026-05-05: Status changed to `review` — all review findings addressed, 287 tests passing
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
