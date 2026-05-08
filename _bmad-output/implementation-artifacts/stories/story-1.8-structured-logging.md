# Story 1.8: Structured Logging & Observability

Status: complete

## Story

As an operations engineer,
I want structured JSON logging with correlation IDs and Azure Application Insights integration,
so that I can trace requests and diagnose issues in production.

## Acceptance Criteria

1. `/src/lib/logger.ts` exports info/warn/error methods producing structured JSON
2. Log entries include: timestamp, level, message, correlationId, tenantId, userId, extra
3. Unique correlationId generated per request and propagated through middleware
4. Application Insights SDK configured for staging/production
5. `/src/config/env.ts` validates all env vars via Zod with fast-fail on startup

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: #4)
  - [x] `npm install applicationinsights` (Azure SDK)
- [x] Task 2: Create logger (AC: #1, #2)
  - [x] `/src/lib/logger.ts`
  - [x] Methods: `logger.info(message, extra?)`, `logger.warn(...)`, `logger.error(...)`
  - [x] Output: `{ timestamp, level, message, correlationId, tenantId, userId, ...extra }`
  - [x] In dev: pretty-print to console
  - [x] In prod: JSON to stdout (picked up by App Insights)
- [x] Task 3: Correlation ID generation (AC: #3)
  - [x] Generate UUID per request in middleware
  - [x] Store in AsyncLocalStorage or request context
  - [x] Logger auto-attaches from context
- [x] Task 4: Application Insights setup (AC: #4)
  - [x] Initialize at app startup if APPLICATIONINSIGHTS_CONNECTION_STRING is set
  - [x] Forward all logs + request traces
- [x] Task 5: Environment validation (AC: #5)
  - [x] `/src/config/env.ts` — Zod schema for ALL env vars (database, auth, azure, llm)
  - [x] Call validation on app startup — throw with clear messages if missing
  - [x] Export typed `env` object for use throughout app

### Review Findings

- [x] [Review][Patch] `JSON.stringify` can throw on circular `extra`, crashes catch block [logger.ts:43-55] — fixed: safeStringify with fallback
- [x] [Review][Patch] `extra` keys can overwrite structural log fields (correlationId, timestamp, etc.) [logger.ts:34] — fixed: RESERVED_KEYS filter
- [x] [Review][Patch] `initAppInsights` not idempotent and has no error handling [appInsights.ts:19-38] — fixed: guard + try-catch
- [x] [Review][Patch] No startup call to `getEnv()` — fast-fail on startup not wired (AC #5) [env.ts] — fixed: instrumentation.ts register()
- [x] [Review][Patch] No startup call to `initAppInsights()` — SDK never activates (AC #4) [appInsights.ts] — fixed: instrumentation.ts register()
- [x] [Review][Patch] No dev pretty-print mode — always outputs JSON regardless of NODE_ENV [logger.ts:41-56] — fixed: formatEntry() with dev mode
- [x] [Review][Patch] Stack traces always logged regardless of environment [handler.ts:133] — fixed: conditional on NODE_ENV
- [x] [Review][Defer] POST always returns 201, DELETE always 204 [handler.ts:117] — deferred, pre-existing
- [x] [Review][Defer] `_audit` deleted via mutation on handler result [handler.ts:112-114] — deferred, pre-existing
- [x] [Review][Defer] Array handler results serialized as objects [handler.ts:94-95] — deferred, pre-existing
- [x] [Review][Defer] `getEnv()` at module scope kills build without DATABASE_URL [env.ts] — deferred, pre-existing/known
- [x] [Review][Defer] Env cache never invalidates on secrets rotation [env.ts:36] — deferred, by-design

## Dev Notes

### Logger Pattern
```typescript
import { AsyncLocalStorage } from 'node:async_hooks'

const contextStorage = new AsyncLocalStorage<{ correlationId: string; tenantId?: string; userId?: string }>()

export const logger = {
  info(message: string, extra?: Record<string, unknown>) {
    const ctx = contextStorage.getStore()
    const entry = { timestamp: new Date().toISOString(), level: 'info', message, ...ctx, ...extra }
    console.log(JSON.stringify(entry))
  },
  // ... warn, error similar
}

export function runWithContext(ctx: { correlationId: string; tenantId?: string; userId?: string }, fn: () => void) {
  contextStorage.run(ctx, fn)
}
```

### Critical: NEVER use console.log in production code
All logging goes through the structured logger. The only exception is the logger itself outputting to console.

### Env Validation Pattern
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  // ... all vars
})

export const env = envSchema.parse(process.env)
```

### Depends On
- No hard dependency (can be built after 1.1 for the env vars to validate)

### References
- [Source: architecture.md#Infrastructure & Deployment — Monitoring, Logging]
- [Source: architecture.md#Anti-Patterns — No console.log in production]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6
### Debug Log References
- Pre-existing test failure in `src/components/layout/navigation.test.ts` (icon type check) — unrelated to this story

### Completion Notes List
- Implemented structured JSON logger using AsyncLocalStorage for context propagation
- Logger outputs `{ timestamp, level, message, correlationId, tenantId, userId, ...extra }`
- Correlation ID (UUID v4) generated per request in `withApiHandler` middleware and propagated via `runWithContext`
- Middleware handler updated to wrap full request lifecycle in logging context, providing automatic tenant/user enrichment
- Application Insights SDK initializes conditionally when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set
- Environment validation expanded: AUTH_SECRET min(32), added APPLICATIONINSIGHTS_CONNECTION_STRING, LLM_ENDPOINT validated as URL
- Error logging integrated into middleware — unhandled errors and audit failures now produce structured log entries

### File List
- `greenmeter/src/lib/logger.ts` — new (structured logger with AsyncLocalStorage, reserved key protection, safe stringify, dev pretty-print)
- `greenmeter/src/lib/logger.test.ts` — new (13 unit tests)
- `greenmeter/src/lib/correlationId.ts` — new (UUID generation utility)
- `greenmeter/src/lib/correlationId.test.ts` — new (2 unit tests)
- `greenmeter/src/lib/appInsights.ts` — new (Application Insights initialization, idempotent, error-safe)
- `greenmeter/src/lib/appInsights.test.ts` — new (5 unit tests)
- `greenmeter/src/config/env.ts` — modified (expanded schema with all env vars, AUTH_SECRET min(32), App Insights var)
- `greenmeter/src/config/env.test.ts` — new (8 unit tests)
- `greenmeter/src/middleware/handler.ts` — modified (correlation ID context wrapping, structured error logging, stack only in non-prod)
- `greenmeter/src/instrumentation.ts` — new (Next.js startup hook: env validation + App Insights init)
- `greenmeter/src/instrumentation.test.ts` — new (2 unit tests)
- `greenmeter/package.json` — modified (added `applicationinsights` dependency)

## Change Log
- 2026-05-05: Implemented structured logger, correlation IDs, App Insights setup, and expanded env validation
- 2026-05-05: Code review patches applied — 7 findings fixed (safe stringify, reserved key protection, idempotent App Insights, startup hooks, dev pretty-print, conditional stack traces)

## Status Log
- 2026-05-05: Status changed to `in-progress` — picked up for implementation
- 2026-05-05: Status changed to `testing` — all tests passing (22 new tests added, 225/226 pass — 1 pre-existing failure unrelated)
- 2026-05-05: Status changed to `review` — code review passed, all 7 patch findings addressed, 248/248 tests passing
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
