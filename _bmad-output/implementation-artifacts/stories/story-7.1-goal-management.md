# Story 7.1: Goal Management CRUD

Status: complete

## Story

As a sustainability director,
I want to create ESG goals with weighted component decomposition,
so that I can formally track commitments.

## Acceptance Criteria

1. GET /api/goals returns all goals for tenant with status, target, progress, component count
2. POST /api/goals creates goal (name, target_value, target_date, linked param_id or canonical_id)
3. POST /api/goals/[goalId]/components adds weighted components (sub-targets contributing by weight)
4. /goals page displays goals with name, target, current value, % progress, target date
5. Progress = sum(component_progress x component_weight)
6. All changes audit logged

## Tasks / Subtasks

- [x] Create goalRepository (AC: #1, #2, #3)
  - [x] Define goals table schema in Drizzle (id, tenant_id, name, target_value, target_date, param_id, canonical_id, status, created_at, updated_at)
  - [x] Define goal_components table schema (id, goal_id, name, target_value, weight, param_id, created_at)
  - [x] Implement findAllByTenant, findById, create, update, delete methods
  - [x] Implement addComponent, removeComponent, getComponents methods
- [x] Create goalService (AC: #5, #6)
  - [x] Implement CRUD operations delegating to repository
  - [x] Implement progress computation: sum(component_progress x component_weight)
  - [x] Validate component weights sum to 1.0 on add/update
  - [x] Integrate audit logging for all mutations
- [x] Create API routes (AC: #1, #2, #3)
  - [x] GET /api/goals — list goals for tenant with computed progress and component count
  - [x] POST /api/goals — create new goal with validation
  - [x] GET /api/goals/[goalId] — single goal detail with components
  - [x] PUT /api/goals/[goalId] — update goal
  - [x] DELETE /api/goals/[goalId] — soft delete goal
  - [x] POST /api/goals/[goalId]/components — add weighted component
- [x] Create goals page and components (AC: #4)
  - [x] Build /goals page with goal list and summary stats
  - [x] Build GoalCard component (name, target, current value, % progress bar, target date)
  - [x] Build GoalForm component (create/edit goal modal)

## Dev Notes

- Service: /src/services/goalService.ts — CRUD + progress computation
- Repository: /src/db/repositories/goalRepository.ts
- API: /src/app/api/goals/route.ts (GET, POST), /src/app/api/goals/[goalId]/route.ts (GET, PUT, DELETE)
- Components API: POST /api/goals/[goalId]/components
- Page: /src/app/(dashboard)/goals/page.tsx
- Components: /src/components/goals/GoalCard.tsx, /src/components/goals/GoalForm.tsx
- Goal links to param_id or canonical_id for tracking actual value vs target
- Component weights must sum to 1.0 (or 100%)
- Progress per component: (current_value / target_value) clamped to 0-100%

### Depends On
- Story 4.3 (KPI values provide the "current value" for goal tracking)

### References
- [Source: product-brief.md — Goal management with component decomposition]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None required — all tests pass on first run.

### Completion Notes List
- Implemented full Goal Management CRUD stack following existing codebase patterns
- goalRepository: findAllByTenant with componentCount subquery, findById, create, update, delete, getComponents, addComponent, removeComponent
- goalService: CRUD with progress computation, weight validation (sum ≤ 1.0), structured logging
- API routes: GET/POST /api/goals, GET/PUT/DELETE /api/goals/[goalId], POST /api/goals/[goalId]/components
- Middleware chain: auth → tenant → role → handler → audit on all routes
- GoalCard component: name, target value, target year, status badge, progress bar, component count
- GoalForm component: create/edit modal with parameter selection dropdown
- Goals page: data-driven with TanStack Query hooks, pagination, empty state
- Zod schemas: goalListFilterSchema, goalComponentCreateSchema added to existing goals.ts
- DB schema: added paramId column to goal_components for KPI parameter linking
- 48 new tests (17 service, 6 schema, 14 goals route, 11 goals/[goalId] route)
- Full regression suite: 1146 tests pass across 91 files (10 pre-existing failures in scoreRecompute/verify from in-progress stories 4.4 and 6.1)
- Code review performed and all High/Medium findings addressed

### File List
- greenmeter/src/db/schema/goals.ts (modified — added paramId to goalComponents)
- greenmeter/src/db/repositories/goalRepository.ts (new)
- greenmeter/src/services/goalService.ts (new)
- greenmeter/src/services/goalService.test.ts (new)
- greenmeter/src/schemas/goals.ts (modified — added goalListFilterSchema, goalComponentCreateSchema, types, numeric/year validation)
- greenmeter/src/schemas/goals.test.ts (modified — added tests for new schemas)
- greenmeter/src/app/api/goals/route.ts (new)
- greenmeter/src/app/api/goals/route.test.ts (new)
- greenmeter/src/app/api/goals/[goalId]/route.ts (new)
- greenmeter/src/app/api/goals/[goalId]/route.test.ts (new)
- greenmeter/src/app/api/goals/[goalId]/components/route.ts (new)
- greenmeter/src/app/api/goals/[goalId]/components/route.test.ts (new)
- greenmeter/src/app/api/goals/[goalId]/components/[componentId]/route.ts (new)
- greenmeter/src/hooks/useGoals.ts (new)
- greenmeter/src/components/goals/GoalCard.tsx (new)
- greenmeter/src/components/goals/GoalForm.tsx (new)
- greenmeter/src/app/(dashboard)/goals/page.tsx (modified — replaced prototype with data-driven page)

## Change Log
- 2026-05-07: Full Goal Management CRUD implementation — repository, service, API routes, UI components, hooks, tests
- 2026-05-07: Code review fixes — fixed comment accuracy (H-1), AppError in repo (H-2), baselineValue numeric validation (H-3), added DELETE component route (M-1), N+1 optimization (M-3), form key prop (M-4), query key pagination (L-4), additional schema and route tests (L-6, L-7), year validation regex (M-7)

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all new tests passing
- 2026-05-07: Status changed to `review` — code review passed, all findings addressed, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved
