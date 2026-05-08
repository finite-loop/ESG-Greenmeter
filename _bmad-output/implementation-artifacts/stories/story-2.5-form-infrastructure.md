# Story 2.5: Form Infrastructure (React Hook Form + Zod)

Status: complete

## Story

As a developer,
I want React Hook Form with Zod resolver and shared validation schemas,
so that all forms have consistent validation matching API schemas.

## Acceptance Criteria

1. React Hook Form and @hookform/resolvers installed
2. Forms use `useForm` with `zodResolver` for client-side validation
3. Shared Zod schemas in `/src/schemas/` serve both API and form validation
4. `/src/schemas/common.ts` exports paginationSchema, filterSchema, uuidSchema
5. A sample form demonstrates the pattern (for dev reference)

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: #1)
  - [x] `npm install react-hook-form @hookform/resolvers`
  - [x] (zod already installed from Story 1.1)
- [x] Task 2: Create common schemas (AC: #3, #4)
  - [x] `/src/schemas/common.ts`:
    - paginationSchema: { page: number, pageSize: number }
    - sortSchema: { sortBy?: string, sortOrder: 'asc'|'desc' }
    - filterSchema: { standard?, pillar?, fiscalYear?, search? }
    - uuidSchema: z.string().uuid()
    - dateRangeSchema: { from?: date, to?: date } with cross-field validation
- [x] Task 3: Create domain schema stubs (AC: #3)
  - [x] `/src/schemas/kpi.ts` — kpiValueCreateSchema, kpiValueUpdateSchema, kpiValueVerifySchema
  - [x] `/src/schemas/goals.ts` — goalCreateSchema, goalUpdateSchema, milestoneCreateSchema
  - [x] `/src/schemas/users.ts` — userInviteSchema, userUpdateSchema
  - [x] `/src/schemas/config.ts` — thresholdSchema, weightSchema, tenantConfigSchema
  - [x] `/src/schemas/extraction.ts` — extractionTriggerSchema, mappingDecisionSchema, batchMappingSchema
  - [x] `/src/schemas/reports.ts` — reportGenerateSchema, reportFilterSchema
- [x] Task 4: Sample form component (AC: #2, #5)
  - [x] `/src/components/forms/SampleForm.tsx` — demonstrates useForm + zodResolver pattern

## Dev Notes

### Form Pattern
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { kpiValueSchema } from '@/schemas/kpi'
import type { z } from 'zod'

type KpiValueForm = z.infer<typeof kpiValueSchema>

function KpiEntryForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<KpiValueForm>({
    resolver: zodResolver(kpiValueSchema),
  })
  // ...
}
```

### Single Source of Truth
The Zod schema defined in `/src/schemas/kpi.ts` is used:
1. In the form (via zodResolver) — client-side validation
2. In the API route — server-side validation: `kpiValueSchema.parse(body)`
3. Generated from Drizzle schema where possible (via drizzle-zod)

### Schema Naming Convention
- camelCase + Schema suffix: `kpiValueSchema`, `goalCreateSchema`
- Input schemas for creates: `createKpiValueSchema`
- Input schemas for updates: `updateKpiValueSchema`
- Output/select schemas: `kpiValueSelectSchema` (from drizzle-zod)

### Depends On
- Story 2.3 (page structure exists to add forms to)

### References
- [Source: architecture.md#Core Architectural Decisions — Zod with drizzle-zod]
- [Source: architecture.md#Frontend Architecture — React Hook Form + Zod resolver]
- [Source: architecture.md#Naming Patterns — Zod schemas camelCase + Schema suffix]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No issues encountered

### Completion Notes List
- **Task 1**: Installed `react-hook-form` and `@hookform/resolvers` (3 packages). Zod 4.4.3 already present.
- **Task 2**: Enhanced `common.ts` with `sortSchema` (sortBy + sortOrder with default 'asc'), `dateRangeSchema` (with cross-field refinement ensuring from <= to), and exported TypeScript types for all schemas.
- **Task 3**: Created 6 domain schema files with comprehensive validation:
  - `kpi.ts` — create/update/verify schemas with sourceType enum and notApplicable default
  - `goals.ts` — goal create/update with numeric validation on targetValue, milestone create with date coercion
  - `users.ts` — invite schema with email validation and role enum, update schema (all optional)
  - `config.ts` — threshold with redMax <= amberMax refinement, weight with 0-1 range validation
  - `extraction.ts` — trigger schema with standard enum (BRSR/ESRS/GRI only), batch mapping with min(1)
  - `reports.ts` — generate schema with format enum (pdf/xbrl/excel), filter schema with status enum
- **Task 4**: Created `SampleForm.tsx` demonstrating the full React Hook Form + zodResolver pattern for developer reference.
- **Testing**: 69 new tests across 7 test files. Total suite: 463 tests, 0 regressions.

### File List
**New files:**
- `greenmeter/src/schemas/kpi.ts` — KPI value schemas (create, update, verify)
- `greenmeter/src/schemas/kpi.test.ts` — 10 tests
- `greenmeter/src/schemas/goals.ts` — Goal and milestone schemas
- `greenmeter/src/schemas/goals.test.ts` — 8 tests
- `greenmeter/src/schemas/users.ts` — User invite and update schemas
- `greenmeter/src/schemas/users.test.ts` — 10 tests
- `greenmeter/src/schemas/config.ts` — Threshold, weight, tenant config schemas
- `greenmeter/src/schemas/config.test.ts` — 9 tests
- `greenmeter/src/schemas/extraction.ts` — Extraction trigger, mapping decision schemas
- `greenmeter/src/schemas/extraction.test.ts` — 7 tests
- `greenmeter/src/schemas/reports.ts` — Report generation and filter schemas
- `greenmeter/src/schemas/reports.test.ts` — 7 tests
- `greenmeter/src/schemas/common.test.ts` — 18 tests for common schemas
- `greenmeter/src/components/forms/SampleForm.tsx` — Developer reference form

**Modified files:**
- `greenmeter/src/schemas/common.ts` — Added sortSchema, dateRangeSchema, TypeScript types
- `greenmeter/package.json` — Added react-hook-form, @hookform/resolvers

## Change Log
- 2026-05-06: Implemented form infrastructure with React Hook Form + Zod. Created 6 domain schema stubs, enhanced common schemas, added sample form. 69 new tests, 463 total pass.

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all 463 tests passing (69 new, 0 regressions)
- 2026-05-06: Status changed to `review` — ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
