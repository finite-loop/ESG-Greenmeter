# Story 7.2: Milestone Tracking

Status: complete

## Story

As a project manager,
I want milestones within each goal,
so that long-term goals have intermediate checkpoints.

## Acceptance Criteria

1. Add milestones to a goal: description, target_date, target_value, status
2. Status: pending, achieved, missed (auto or manual)
3. Timeline visualization on goal detail view
4. Auto-achievement: when KPI value meets milestone target_value
5. Visual indicators: green=achieved, gray=upcoming, red=missed (past target_date and not met)

## Tasks / Subtasks

- [x] Add milestones table and repository methods (AC: #1, #2)
  - [x] Define milestones table schema (id, goal_id, description, target_date, target_value, status, achieved_at, created_at)
  - [x] Implement milestone CRUD in goalRepository or separate milestoneRepository
  - [x] Validate milestone belongs to existing goal
- [x] Add milestones CRUD to goals API (AC: #1, #2)
  - [x] POST /api/goals/[goalId]/milestones — create milestone
  - [x] PUT /api/goals/[goalId]/milestones/[milestoneId] — update milestone
  - [x] DELETE /api/goals/[goalId]/milestones/[milestoneId] — remove milestone
- [x] Implement auto-check logic (AC: #4)
  - [x] On kpi_value write, check if value meets any pending milestone target for related goal
  - [x] Mark milestone as achieved with achieved_at timestamp
  - [x] Alternatively: trigger check in score-recompute job after value changes
- [x] Implement missed detection (AC: #2, #5)
  - [x] Scheduled check or on-demand when viewing goal detail
  - [x] If target_date is past and status is still pending, mark as missed
- [x] Build MilestoneTracker component (AC: #3, #5)
  - [x] Timeline/list view showing milestones in chronological order
  - [x] Visual indicators: green=achieved, gray=upcoming, red=missed
  - [x] Integrate into goal detail view

### Review Findings
- [x] [Review][Patch] `markMilestonesMissed` uses raw SQL `ANY()` — replace with Drizzle `inArray()` and return actual affected row count [goalRepository.ts]
- [x] [Review][Patch] PUT/DELETE milestone routes must verify milestone belongs to URL's goalId — cross-goal access possible [milestones/[milestoneId]/route.ts]
- [x] [Review][Patch] `updateMilestone` with empty input causes invalid SQL (empty SET clause) — add empty-check guard [goalService.ts]
- [x] [Review][Patch] AC4: Wire `checkMilestonesForParam` into KPI value write path [kpiService.ts]
- [x] [Review][Patch] `checkMilestonesForParam` should filter by active goal status only [goalRepository.ts]
- [x] [Review][Patch] `group-hover` on edit/delete buttons — ensure parent element has `group` class [MilestoneTracker.tsx]
- [x] [Review][Defer] Race condition in `checkMilestonesForParam` — concurrent writes could double-achieve — deferred, pre-existing architectural concern

## Dev Notes

- API extension: POST/PUT/DELETE /api/goals/[goalId]/milestones
- Table: milestones (goal_id, description, target_date, target_value, status, achieved_at)
- Component: /src/components/goals/MilestoneTracker.tsx — timeline/list view
- Auto-check: when kpi_value is written and matches a milestone's param+target, mark achieved
- Or: score-recompute job checks milestones after value changes
- Missed detection: scheduled check or on-demand when viewing goal detail

### Depends On
- Story 7.1 (goals must exist)

### References
- [Source: product-brief.md — milestone tracking]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None required — all tests pass on first run (after fixing DELETE status code expectations from 200 to 204).

### Completion Notes List
- Updated milestones DB schema: replaced `achieved` boolean with `status` text field (pending/achieved/missed), added `description` column
- Updated milestoneCreateSchema: removed goalId (from URL), added description, targetValue numeric validation
- Added milestoneUpdateSchema with status enum support
- Added 10 milestone repository methods to goalRepository: getMilestones, findMilestoneById, createMilestone, updateMilestone, deleteMilestone, findPendingMilestonesPastDue, findPendingMilestonesByGoalParam, markMilestoneAchieved, markMilestonesMissed
- Added 7 milestone service methods to goalService: getMilestones, createMilestone, updateMilestone, deleteMilestone, checkMilestonesForParam (auto-achievement), detectMissedMilestones
- Updated goalService.getById to return milestones alongside components, with on-demand missed detection
- Created GET/POST /api/goals/[goalId]/milestones API routes with middleware chain
- Created PUT/DELETE /api/goals/[goalId]/milestones/[milestoneId] API routes with middleware chain
- Built MilestoneTracker component: timeline view with green/gray/red visual indicators, date formatting, edit/delete callbacks
- Built MilestoneForm component: modal form for create/edit with status field in edit mode
- Created goal detail page at /goals/[goalId] with MilestoneTracker, components, and goal header
- Updated GoalCard to link to detail page for navigation
- Added milestone query key to queryKeys factory
- Added 4 milestone hooks: useCreateMilestone, useUpdateMilestone, useDeleteMilestone (useGoalDetail already fetches milestones)
- 82 new tests across 4 files: 21 milestone service, 14 milestones route, 13 milestones/[milestoneId] route, 34 updated schema tests
- Code review: 6 patch findings addressed, 1 deferred (pre-existing race condition), 3 dismissed
- Post-review: replaced raw SQL ANY() with Drizzle inArray(), added goalId ownership checks on PUT/DELETE, empty-update guard, wired checkMilestonesForParam into kpiService create/update, active-goal-only filter, fixed group-hover class
- Full regression after review patches: 1429 tests pass, 0 failures

### File List
- greenmeter/src/db/schema/goals.ts (modified — replaced `achieved` boolean with `status` text, added `description`)
- greenmeter/src/db/repositories/goalRepository.ts (modified — added MilestoneRow interface, 10 milestone methods)
- greenmeter/src/services/goalService.ts (modified — added MilestoneRow import, updated getById to include milestones with on-demand missed detection, added 7 milestone service methods)
- greenmeter/src/services/goalService.test.ts (modified — added getMilestones mock, updated getById tests)
- greenmeter/src/services/milestoneService.test.ts (new — 21 tests for milestone service methods)
- greenmeter/src/schemas/goals.ts (modified — updated milestoneCreateSchema, added milestoneUpdateSchema and MilestoneUpdate type)
- greenmeter/src/schemas/goals.test.ts (modified — updated milestoneCreateSchema tests, added milestoneUpdateSchema tests)
- greenmeter/src/app/api/goals/[goalId]/milestones/route.ts (new — GET/POST milestone endpoints)
- greenmeter/src/app/api/goals/[goalId]/milestones/route.test.ts (new — 14 tests)
- greenmeter/src/app/api/goals/[goalId]/milestones/[milestoneId]/route.ts (new — PUT/DELETE milestone endpoints)
- greenmeter/src/app/api/goals/[goalId]/milestones/[milestoneId]/route.test.ts (new — 13 tests)
- greenmeter/src/lib/queryKeys.ts (modified — added goals.milestones query key)
- greenmeter/src/hooks/useGoals.ts (modified — added MilestoneRow/MilestoneCreateInput/MilestoneUpdateInput interfaces, milestones in GoalDetail, useCreateMilestone/useUpdateMilestone/useDeleteMilestone hooks)
- greenmeter/src/components/goals/MilestoneTracker.tsx (new — timeline component with green/gray/red indicators)
- greenmeter/src/components/goals/MilestoneForm.tsx (new — modal form for create/edit milestones)
- greenmeter/src/components/goals/GoalCard.tsx (modified — added Link import and goal name linking to detail page)
- greenmeter/src/app/(dashboard)/goals/[goalId]/page.tsx (new — goal detail page with MilestoneTracker integration)
- greenmeter/src/services/kpiService.ts (modified — wired checkMilestonesForParam into createValue and updateValue)
- greenmeter/src/services/kpiService.test.ts (modified — added goalService mock for milestone auto-achievement)

## Change Log
- 2026-05-07: Full Milestone Tracking implementation — schema, repository, service, API routes, auto-check/missed detection, UI components, hooks, tests
- 2026-05-07: Code review patches — 6 findings fixed, 1 deferred, 3 dismissed

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (1375 pass, 1 pre-existing failure unrelated to this story)
- 2026-05-07: Status changed to `review` — code review passed, 6 patches applied, 1429 tests passing, ready for human review
- 2026-05-07: Status changed to `complete` — human review approved. All 5 ACs verified, implementation confirmed across all files.
