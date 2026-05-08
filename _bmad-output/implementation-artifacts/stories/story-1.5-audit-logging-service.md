# Story 1.5: Audit Logging Service

Status: complete

## Story

As a compliance officer,
I want every data modification automatically recorded in an immutable audit trail,
so that I can trace any change to a specific user, time, and action.

## Acceptance Criteria

1. `auditService.ts` inserts append-only records into audit_logs
2. Records include: user_id, tenant_id, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), timestamp
3. audit_logs table disallows UPDATE and DELETE at application level
4. GET /api/audit returns paginated, filterable audit entries (entity_type, user, date range, action)
5. Audit entries are RLS-scoped (only current tenant's logs visible)

## Tasks / Subtasks

- [x] Task 1: Create audit service (AC: #1, #2, #3)
  - [x] `/src/services/auditService.ts`
  - [x] `logChange(params: { userId, tenantId, action, entityType, entityId, oldValue?, newValue? })`
  - [x] Insert into audit_logs — no update/delete methods exposed
- [x] Task 2: Create audit repository (AC: #1)
  - [x] `/src/db/repositories/auditRepository.ts`
  - [x] `insert(entry)` — only method (no update/delete)
  - [x] `findFiltered(filters, pagination)` — for API
- [x] Task 3: Create audit API route (AC: #4, #5)
  - [x] `GET /src/app/api/audit/route.ts`
  - [x] Query params: entity_type, user_id, action, date_from, date_to, page, pageSize
  - [x] Return `{ data: AuditEntry[], meta: { page, pageSize, total } }`
  - [x] Wrap with withApiHandler (roles: admin, analyst)
- [x] Task 4: Create Zod schema for audit filters
  - [x] `/src/schemas/audit.ts` — auditFilterSchema

## Dev Notes

### Audit Entry Shape
```typescript
interface AuditEntry {
  log_id: string        // UUID
  tenant_id: string
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'IMPORT'
  entity_type: string   // 'kpi_value', 'goal', 'parameter', 'user', etc.
  entity_id: string
  old_value: object | null  // JSONB — null for CREATE
  new_value: object | null  // JSONB — null for DELETE
  created_at: Date
}
```

### Integration with Middleware
The audit middleware (Story 1.4) calls `auditService.logChange()` after successful writes.
Service layer also calls it directly for complex operations.

### Critical Rules
- NEVER expose update/delete on audit_logs through the service
- old_value captures the FULL entity state before change (not just modified fields)
- new_value captures the FULL entity state after change

### Depends On
- Story 1.4 (middleware chain calls this service)
- Story 1.1 (audit_logs table)

### References
- [Source: architecture.md#Process Patterns — Audit Logging]
- [Source: architecture.md#Cross-Cutting Concerns — Audit trail generation]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — all tests passed on first verification run.

### Completion Notes List
- Audit service (`auditService.ts`) implements append-only `logChange()` and paginated `getFiltered()` methods
- Audit repository (`auditRepository.ts`) exposes only `insert()` and `findFiltered()` — no update/delete — preserving immutability
- API route (`GET /api/audit`) validates query params via `auditFilterSchema`, requires admin/analyst roles, returns `{ data, meta }` format
- Zod schema (`audit.ts`) validates action enum, UUID userId, date coercion, and inherits pagination from `paginationSchema`
- Integration with middleware chain: `src/middleware/audit.ts` calls `auditService.logChange()` after successful writes
- RLS scoping handled by tenant middleware setting `app.current_tenant_id` session variable before queries execute
- All 146 tests pass (10 test files) with no regressions

### File List
- `src/services/auditService.ts` — audit service with logChange + getFiltered
- `src/services/auditService.test.ts` — unit tests for audit service
- `src/db/repositories/auditRepository.ts` — append-only data access layer
- `src/app/api/audit/route.ts` — GET /api/audit route handler
- `src/app/api/audit/route.test.ts` — API route tests
- `src/schemas/audit.ts` — Zod validation schema for audit filters
- `src/schemas/audit.test.ts` — schema validation tests
- `src/middleware/audit.ts` — audit middleware (records changes after writes)
- `src/middleware/audit.test.ts` — middleware tests
- `src/db/schema/audit.ts` — Drizzle schema for audit_logs table

## Change Log
- 2026-05-05: Story resumed — all implementation found complete, tests passing (146/146)
- 2026-05-05: All tasks verified and marked [x], status → review

## Status Log
- 2026-05-05: Status changed to `in-progress` — story previously picked up
- 2026-05-05: Status changed to `review` — all tasks complete, all tests passing, all ACs satisfied
- 2026-05-05: Status changed to `complete` — human review approved
