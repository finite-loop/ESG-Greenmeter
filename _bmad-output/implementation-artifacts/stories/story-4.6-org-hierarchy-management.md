# Story 4.6: Org Hierarchy Management

Status: complete

## Story

As a tenant administrator,
I want to manage my org hierarchy after onboarding,
so that structure changes are reflected in data collection.

## Acceptance Criteria

1. GET /api/org-hierarchy returns full tree for current tenant
2. POST /api/org-hierarchy creates new node under specified parent
3. PUT /api/org-hierarchy/[nodeId] updates name/type/currency/parent
4. DELETE /api/org-hierarchy/[nodeId] only if no children and no KPI values exist
5. 409 Conflict returned if delete preconditions not met
6. /rollup page shows the hierarchy tree view

## Tasks / Subtasks

- [x] Create org hierarchy API routes (AC: #1, #2, #3, #4, #5)
  - [x] GET `/src/app/api/org-hierarchy/route.ts` — return full tree for tenant
  - [x] POST `/src/app/api/org-hierarchy/route.ts` — create node under parent
  - [x] GET `/src/app/api/org-hierarchy/[nodeId]/route.ts` — single node detail
  - [x] PUT `/src/app/api/org-hierarchy/[nodeId]/route.ts` — update name/type/currency/parent
  - [x] DELETE `/src/app/api/org-hierarchy/[nodeId]/route.ts` — delete with precondition checks
  - [x] Return 409 Conflict if node has children or KPI values on delete attempt
- [x] Create org hierarchy repository with tree queries (AC: #1, #4, #5)
  - [x] Implement tree query (recursive CTE or fetch all + build client-side)
  - [x] Implement create node with parent validation
  - [x] Implement update with circular reference check on reparenting
  - [x] Implement delete guard: check org_nodes (children) + kpi_values (data)
- [x] Create rollup page with tree visualization (AC: #6)
  - [x] Build `/src/app/(dashboard)/rollup/page.tsx`
  - [x] Display hierarchy as interactive tree view
  - [x] Show selected node detail panel

### Review Findings

- [x] [Review][Decision] Node type enum mismatch: spec says "subsidiary/facility" but code and DB use "division/site" — resolved: DB schema is authoritative, Dev Notes outdated
- [x] [Review][Patch] Reparenting doesn't update descendant levels — fixed: added updateDescendantLevels recursive CTE
- [x] [Review][Patch] Wrong error code (DUPLICATE_ENTRY) for delete conflicts — fixed: added CONFLICT to ErrorCode, updated service
- [x] [Review][Patch] updateOrgNodeSchema missing .trim() on name field — fixed: added .trim()
- [x] [Review][Patch] updateOrgNodeSchema accepts empty object {} — fixed: service returns existing node when no fields changed
- [x] [Review][Patch] Selected node detail panel shows stale data after tree refresh — fixed: track selectedNodeId, find in tree
- [x] [Review][Patch] node.active can be null but UI treats it as boolean — fixed: explicit null check (null treated as active)
- [x] [Review][Defer] TOCTOU race on reparent circular-reference check — requires transactional infra — deferred, pre-existing pattern
- [x] [Review][Defer] TOCTOU race on delete safety checks — requires transactional infra — deferred, pre-existing pattern
- [x] [Review][Defer] Recursive CTE has no depth/cycle guard — deferred, PostgreSQL has built-in limits
- [x] [Review][Defer] currency field lacks ISO 4217 validation — deferred, enhancement
- [x] [Review][Defer] code field lacks format/uniqueness validation — deferred, enhancement
- [x] [Review][Defer] No sibling name uniqueness check — deferred, no DB constraint exists
- [x] [Review][Defer] No pagination on findAllByTenant — deferred, org hierarchies are bounded
- [x] [Review][Defer] nodeType hierarchy consistency not enforced — deferred, business rule not in spec
- [x] [Review][Defer] code field not unique within tenant — deferred, enhancement

## Dev Notes

- API: `/src/app/api/org-hierarchy/route.ts` (GET tree, POST create), `/src/app/api/org-hierarchy/[nodeId]/route.ts` (GET, PUT, DELETE)
- Tree query: recursive CTE or fetch all nodes for tenant then build tree client-side
- Page: `/src/app/(dashboard)/rollup/page.tsx` — shows tree + selected node detail
- Node types: company (root), subsidiary, facility, department
- Delete guard: check org_nodes (children) + kpi_values (data) before allowing delete
- Reparenting: update parent_node_id (validate no circular references)

### Depends On
- Story 3.3 (initial nodes created during onboarding)

### References
- [Source: architecture.md#API Response Formats]
- [Source: product-brief.md — org hierarchy]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No debug issues encountered

### Completion Notes List
- Implemented full CRUD API routes for org hierarchy management following established patterns (withApiHandler, service layer, repository)
- Repository uses fetch-all + client-side tree building for tree query (avoids recursive CTE complexity while RLS handles tenant filtering)
- Repository includes recursive CTE for descendant detection used in circular reference validation
- Delete guards check both child org_nodes and kpi_values before allowing deletion, returning 409 Conflict
- Reparenting validates no circular references by checking descendants of the node being moved
- Service computes child node level automatically based on parent level
- Rollup page updated from prototype to real API-connected tree view with interactive node selection and detail panel
- Zod schemas validate node types (company, division, department, site), UUID formats, and string constraints
- 46 new unit tests covering all API routes, service logic, and edge cases (auth, validation, CRUD, tree building, delete guards, circular reference detection)
- All 736 tests pass (0 regressions)
- No TypeScript errors in new files

### File List
- `greenmeter/src/schemas/orgHierarchy.ts` (new) — Zod validation schemas for create/update org nodes
- `greenmeter/src/db/repositories/orgHierarchyRepository.ts` (new) — Data access layer for org_nodes table
- `greenmeter/src/services/orgHierarchyService.ts` (new) — Business logic: tree building, validation, delete guards
- `greenmeter/src/app/api/org-hierarchy/route.ts` (new) — GET tree + POST create node
- `greenmeter/src/app/api/org-hierarchy/[nodeId]/route.ts` (new) — GET/PUT/DELETE single node
- `greenmeter/src/app/api/org-hierarchy/route.test.ts` (new) — Tests for collection routes
- `greenmeter/src/app/api/org-hierarchy/[nodeId]/route.test.ts` (new) — Tests for node routes
- `greenmeter/src/services/orgHierarchyService.test.ts` (new) — Tests for service logic
- `greenmeter/src/app/(dashboard)/rollup/page.tsx` (modified) — Updated from prototype to API-connected tree view
- `greenmeter/src/lib/errors.ts` (modified) — Added CONFLICT error code

## Change Log
- 2026-05-06: Implemented full org hierarchy CRUD API, repository, service, Zod schemas, tests, and updated rollup page
- 2026-05-06: Code review patches applied — 6 fixes (descendant level update, error codes, schema trim, empty update guard, stale node fix, null active handling), 1 decision resolved (node types match DB), 9 deferred, 10 dismissed

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all 736 tests passing (46 new, 0 regressions)
- 2026-05-06: Status changed to `review` — code review passed, 6 patches applied, all 737 tests passing
- 2026-05-06: Status changed to `complete` — human review approved
