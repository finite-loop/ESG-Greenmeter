# Story 3.3: Onboarding Wizard — Org Hierarchy & Fiscal Year

Status: complete

## Story

As a tenant administrator,
I want to define my org hierarchy and fiscal year during onboarding,
so that data collection is structured correctly.

## Acceptance Criteria

1. Step 3 (Org Hierarchy): create tree nodes — Company (root) → Subsidiaries → Facilities → Departments
2. Each node has: name, type, currency, parent
3. Step 4 (Fiscal Year): set start month, auto-generate reporting periods
4. Completing all 4 steps marks tenant as onboarded and redirects to dashboard
5. Org nodes stored in org_nodes table with self-referential parent_node_id
6. At least one reporting period created for the current fiscal year

## Tasks / Subtasks

- [x] Create OrgHierarchy step (AC: #1, #2, #5)
  - [x] Build `/src/app/(auth)/onboarding/steps/OrgHierarchy.tsx`
  - [x] Implement tree builder UI with simple list/indent view
  - [x] Support adding child nodes interactively under any existing node
  - [x] Node types: 'company' (root, only one), 'subsidiary', 'facility', 'department'
  - [x] Each node fields: name, type, currency, parent
  - [x] Validate at least one root company node exists
- [x] Create FiscalYearSetup step (AC: #3, #6)
  - [x] Build `/src/app/(auth)/onboarding/steps/FiscalYearSetup.tsx`
  - [x] Dropdown to select fiscal year start month (January–December)
  - [x] Preview auto-generated period labels (e.g., April start → "FY2024-25", "FY2025-26")
  - [x] Generate at least one reporting period for the current fiscal year on submit
- [x] Create API for org nodes and periods (AC: #1, #3, #5, #6)
  - [x] POST /api/onboarding/org-nodes — batch create org nodes with parent relationships
  - [x] POST /api/onboarding/fiscal-year — save start month and generate reporting periods
  - [x] Validate org node parent references are valid within the batch
- [x] Create completion endpoint (AC: #4)
  - [x] PATCH /api/onboarding/complete — sets tenant_config.onboarding_complete = true
  - [x] Redirect user to dashboard after successful completion

## Dev Notes

- Step components: `/src/app/(auth)/onboarding/steps/OrgHierarchy.tsx`, `FiscalYearSetup.tsx`
- Tree builder: allow adding child nodes interactively (simple list/indent view, not a full tree widget)
- Node types: 'company' (root, only one), 'subsidiary', 'facility', 'department'
- Each node can have its own currency (for multi-currency rollups later)
- Fiscal year start month → generate period labels: if April start → "FY2024-25", "FY2025-26"
- API: POST /api/onboarding/org-nodes (batch create), POST /api/onboarding/fiscal-year
- Completion: PATCH /api/onboarding/complete → sets tenant_config.onboarding_complete = true

### Depends On
- Story 3.2 (steps 1-2 must work first)

### References
- [Source: architecture.md#Complete Project Directory Structure]
- [Source: product-brief.md#Scope (org hierarchy)]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 559 tests pass (51 test files), zero regressions
- 22 new tests added (schema validation + API endpoint tests)

### Completion Notes List
- Built OrgHierarchy step with interactive tree builder: indented list view, add/remove child nodes, node type selection, optional currency per node
- Built FiscalYearSetup step with month dropdown and live period preview showing current + next FY labels
- Created POST /api/onboarding/org-nodes API: validates batch (exactly 1 company root, valid parent refs), topological sort for insertion order, maps tempId→nodeId for parent FK resolution
- Created POST /api/onboarding/fiscal-year API: updates tenant fiscal_year_start, computes current FY period dates/label, creates reporting_period record
- Created PATCH /api/onboarding/complete API: sets onboardingComplete=true on tenant
- Extended onboarding wizard from 2 steps to 4 steps: frameworks no longer redirects to dashboard, instead advances to org hierarchy, then fiscal year, then completion
- Added Zod schemas: orgNodeSchema, orgHierarchySchema (min 1 node, exactly 1 company), fiscalYearSchema (month 1-12 integer)
- Wizard passes companyName from step 1 as default root node name in step 3

### File List
- `src/app/(auth)/onboarding/page.tsx` — modified (extended to 4 steps with org + fiscal year)
- `src/app/(auth)/onboarding/steps/OrgHierarchy.tsx` — new (org tree builder UI)
- `src/app/(auth)/onboarding/steps/FiscalYearSetup.tsx` — new (fiscal year start + period preview)
- `src/app/api/onboarding/org-nodes/route.ts` — new (batch org node creation)
- `src/app/api/onboarding/org-nodes/route.test.ts` — new (4 tests)
- `src/app/api/onboarding/fiscal-year/route.ts` — new (fiscal year + period generation)
- `src/app/api/onboarding/fiscal-year/route.test.ts` — new (5 tests)
- `src/app/api/onboarding/complete/route.ts` — new (mark onboarding complete)
- `src/app/api/onboarding/complete/route.test.ts` — new (1 test)
- `src/schemas/onboarding.ts` — modified (added orgNodeSchema, orgHierarchySchema, fiscalYearSchema, NODE_TYPES)
- `src/schemas/onboarding.test.ts` — modified (added 12 tests for new schemas)

## Change Log
- 2026-05-06: Implemented org hierarchy step, fiscal year step, 3 API endpoints, extended wizard to 4 steps, added schemas and tests

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `review` — all tasks complete, 559 tests passing, ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
