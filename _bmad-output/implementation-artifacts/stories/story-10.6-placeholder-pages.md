# Story 10.6: Placeholder Pages (Materiality, Industry Data)

Status: complete

## Story

As a developer,
I want placeholder pages for Materiality and Industry Data,
so that navigation is complete.

## Acceptance Criteria

1. /materiality page renders "Materiality Assessment — Coming Soon" with description
2. /industry-data page renders "Industry Data Explorer — Coming Soon" with description
3. Both use standard dashboard layout
4. Both accessible from sidebar navigation

## Tasks / Subtasks

- [x] Task 1: Create Materiality placeholder page (AC: #1, #3)
  - [x] Page at /src/app/(dashboard)/materiality/page.tsx
  - [x] Card with title "Materiality Assessment"
  - [x] Description: "Double materiality assessment for identifying material ESG topics"
  - [x] "Coming Soon" badge
  - [x] Uses standard dashboard layout
- [x] Task 2: Create Industry Data placeholder page (AC: #2, #3)
  - [x] Page at /src/app/(dashboard)/industry-data/page.tsx
  - [x] Card with title "Industry Data Explorer"
  - [x] Description: "Explore ESG data across industries and benchmark against sector peers"
  - [x] "Coming Soon" badge
  - [x] Uses standard dashboard layout
- [x] Task 3: Add sidebar navigation entries (AC: #4)
  - [x] Add /materiality link to sidebar nav
  - [x] Add /industry-data link to sidebar nav
  - [x] Ensure both are accessible and properly highlighted when active

## Dev Notes

- Pages: /src/app/(dashboard)/materiality/page.tsx, /src/app/(dashboard)/industry-data/page.tsx
- Simple: Card with title, description of planned functionality, and a "Coming Soon" badge
- Materiality description: "Double materiality assessment for identifying material ESG topics"
- Industry Data description: "Explore ESG data across industries and benchmark against sector peers"
- These are quick implementations — use existing UI primitives (Card, Badge)

### Depends On
- Story 2.3 (routing/layout shell exists)

### References
- [Source: decisions-log.md#D13 — Materiality & Industry Data in scope, static mockups TBD]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Navigation tests from Story 2.3 needed updating (expected 9 items, now 11) — fixed and passing

### Completion Notes List
- **Task 1**: Upgraded materiality page from minimal placeholder to styled card with "Coming Soon" badge, proper title, and expanded description about double materiality assessment.
- **Task 2**: Upgraded industry-data page with same card pattern — "Coming Soon" badge, title "Industry Data Explorer", description about sector comparison and benchmarking.
- **Task 3**: Added "Materiality" (Layers icon) and "Industry Data" (Globe icon) to sidebar NAV_ITEMS between Knowledge and Settings. Both pages are accessible via sidebar and highlight correctly using the existing `isActive()` pathname matching.
- Updated navigation tests to reflect 11 nav items (was 9).
- All 469 tests pass, 0 regressions.

### File List
**Modified files:**
- `greenmeter/src/app/(dashboard)/materiality/page.tsx` — Upgraded to styled card placeholder
- `greenmeter/src/app/(dashboard)/industry-data/page.tsx` — Upgraded to styled card placeholder
- `greenmeter/src/components/layout/navigation.ts` — Added Materiality + Industry Data nav entries
- `greenmeter/src/components/layout/navigation.test.ts` — Updated assertions for 11 items

## Change Log
- 2026-05-06: Created styled placeholder pages for Materiality and Industry Data with Coming Soon badges. Added sidebar navigation entries. Updated nav tests.

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all 469 tests passing (0 regressions)
- 2026-05-06: Status changed to `review` — ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
