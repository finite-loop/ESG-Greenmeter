# Story 2.3: Convert to App Router File-Based Routing

Status: complete

## Story

As a developer,
I want the application converted from AppShell state-switching to Next.js App Router file-based routing,
so that each screen is code-split, URL-addressable, and supports loading/error states.

## Acceptance Criteria

1. All route pages created per architecture structure (auth group + dashboard group)
2. `(auth)` group uses centered layout without sidebar
3. `(dashboard)` group uses full layout with Sidebar + TopBar + RollupBar
4. Existing screen content migrated to respective page.tsx files
5. Each page renders existing visual output (content preserved, shell changed)
6. Root layout (`/src/app/layout.tsx`) sets up providers (fonts, metadata)

## Tasks / Subtasks

- [x] Task 1: Create root layout (AC: #6)
  - [x] `/src/app/layout.tsx` — html, body, font loading (DM Sans), metadata
  - [x] `/src/app/globals.css` — Tailwind directives + design tokens
- [x] Task 2: Create auth route group (AC: #1, #2)
  - [x] `/src/app/(auth)/layout.tsx` — centered, no sidebar
  - [x] `/src/app/(auth)/login/page.tsx` — placeholder login screen
  - [x] `/src/app/(auth)/onboarding/page.tsx` — placeholder onboarding
- [x] Task 3: Create dashboard route group (AC: #1, #3, #4)
  - [x] `/src/app/(dashboard)/page.tsx` — Dashboard home
  - [x] `/src/app/(dashboard)/console/page.tsx` — KPI Console
  - [x] `/src/app/(dashboard)/rollup/page.tsx` — Org hierarchy rollup
  - [x] `/src/app/(dashboard)/analytics/page.tsx` — Benchmarking + MDS
  - [x] `/src/app/(dashboard)/goals/page.tsx` — Goal management
  - [x] `/src/app/(dashboard)/reports/page.tsx` — Report generation
  - [x] `/src/app/(dashboard)/supply-chain/page.tsx` — Supplier scorecards
  - [x] `/src/app/(dashboard)/knowledge/page.tsx` — Knowledge base
  - [x] `/src/app/(dashboard)/materiality/page.tsx` — Placeholder
  - [x] `/src/app/(dashboard)/industry-data/page.tsx` — Placeholder
  - [x] `/src/app/(dashboard)/settings/page.tsx` — Settings overview
  - [x] `/src/app/(dashboard)/settings/users/page.tsx`
  - [x] `/src/app/(dashboard)/settings/parameters/page.tsx`
  - [x] `/src/app/(dashboard)/settings/integrations/page.tsx`
  - [x] `/src/app/(dashboard)/settings/documents/page.tsx`
  - [x] `/src/app/(dashboard)/settings/thresholds/page.tsx`
  - [x] `/src/app/(dashboard)/settings/audit/page.tsx`
  - [x] `/src/app/(dashboard)/settings/health/page.tsx`
- [x] Task 4: Migrate existing screen content (AC: #5)
  - [x] Move existing prototype screen components into corresponding pages
  - [x] Replace AppShell state switching with actual routing
  - [x] Ensure visual output matches previous prototype

## Dev Notes

### Critical: Incremental Migration
Per D11, this is NOT a big-bang rewrite. The approach:
1. Create the routing structure with page files
2. Move existing screen component code INTO the page files (or import them)
3. Remove the old AppShell state-switching logic
4. The visual result should be identical — only the URL-based routing changes

### Existing Prototype Screens to Migrate
From decisions-log.md: 10 screens fully implemented (frontend only, mock data):
- Dashboard, Console, Analytics, Goals, Reports, Supply Chain, Knowledge, Settings (multiple sub-pages)
- 4 placeholder: Org Hierarchy, Materiality, Audit, Industry Data

### Root Layout Must Include
- Font: DM Sans from /public/fonts/
- Metadata: title, description
- Body wrapper with base styles

### Route Groups
- `(auth)` — parentheses = no URL segment added. Routes: /login, /onboarding
- `(dashboard)` — parentheses = no URL segment. Routes: /, /console, /analytics, etc.

### Depends On
- Story 2.2 (layout components wired into dashboard layout)
- Story 1.3 (middleware protects dashboard routes)

### References
- [Source: architecture.md#Frontend Architecture — Route structure diagram]
- [Source: architecture.md#Complete Project Directory Structure — Full /src/app/ tree]
- [Source: decisions-log.md#D11 — Incremental screen-by-screen refactoring]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No issues encountered during implementation

### Completion Notes List
- **Task 1**: Root layout and globals.css already existed from Story 2.2 with correct metadata, font loading (DM Sans via Google Fonts), and Tailwind directives. No changes needed.
- **Task 2**: Created `(auth)` route group with centered layout (flexbox centering, no sidebar), login placeholder with branding, and onboarding placeholder.
- **Task 3**: Created 18 page.tsx files across the dashboard route group. Main screens (Dashboard, Console, Rollup, Analytics, Goals, Reports, Supply Chain, Knowledge, Settings, Parameters) import existing screen components from `src/app/screens/`. Placeholder pages created for Materiality, Industry Data, Users, Integrations, Documents, and Thresholds. Settings Audit and Health pages already existed from Stories 10.2 and 10.3.
- **Task 4**: Migration strategy: each page.tsx wraps its corresponding screen component, providing a `navigate` adapter that uses `useRouter().push()` with a route map (`SCREEN_ROUTES` in `src/lib/navigation.ts`). The dashboard layout already renders `RollupBar`, so screen components receive a no-op RollupBar to avoid duplication. The old root `page.tsx` (which rendered AppShell directly) was removed. Screen components remain in `src/app/screens/` and are imported by the page files — no big-bang rewrite.
- **Testing**: 25 new tests verifying file structure (route groups, page files, layout files). 5 tests for SCREEN_ROUTES utility. All 324 tests pass (0 regressions). TypeScript type check clean (only pre-existing errors in env.test.ts and appInsights.ts).

### File List
**New files:**
- `greenmeter/src/lib/navigation.ts` — SCREEN_ROUTES map (legacy screen ID → App Router path)
- `greenmeter/src/lib/__tests__/navigation.test.ts` — 5 tests for route mapping
- `greenmeter/src/app/__tests__/app-router.test.ts` — 25 tests for file structure
- `greenmeter/src/app/(auth)/layout.tsx` — centered auth layout
- `greenmeter/src/app/(auth)/login/page.tsx` — login placeholder
- `greenmeter/src/app/(auth)/onboarding/page.tsx` — onboarding placeholder
- `greenmeter/src/app/(dashboard)/page.tsx` — dashboard home (imports DashboardScreen)
- `greenmeter/src/app/(dashboard)/console/page.tsx` — imports ConsoleScreen
- `greenmeter/src/app/(dashboard)/rollup/page.tsx` — imports RollupScreen
- `greenmeter/src/app/(dashboard)/analytics/page.tsx` — imports AnalyticsScreen
- `greenmeter/src/app/(dashboard)/goals/page.tsx` — imports GoalsScreen
- `greenmeter/src/app/(dashboard)/reports/page.tsx` — imports ReportsScreen
- `greenmeter/src/app/(dashboard)/supply-chain/page.tsx` — imports SupplyChainScreen
- `greenmeter/src/app/(dashboard)/knowledge/page.tsx` — imports KnowledgeScreen
- `greenmeter/src/app/(dashboard)/materiality/page.tsx` — placeholder
- `greenmeter/src/app/(dashboard)/industry-data/page.tsx` — placeholder
- `greenmeter/src/app/(dashboard)/settings/page.tsx` — imports SettingsScreen
- `greenmeter/src/app/(dashboard)/settings/users/page.tsx` — placeholder
- `greenmeter/src/app/(dashboard)/settings/parameters/page.tsx` — imports ParamsScreen
- `greenmeter/src/app/(dashboard)/settings/integrations/page.tsx` — placeholder
- `greenmeter/src/app/(dashboard)/settings/documents/page.tsx` — placeholder
- `greenmeter/src/app/(dashboard)/settings/thresholds/page.tsx` — placeholder

**Deleted files:**
- `greenmeter/src/app/page.tsx` — old AppShell entry point (replaced by (dashboard)/page.tsx)

**Unchanged (pre-existing):**
- `greenmeter/src/app/layout.tsx` — root layout (already correct from Story 2.2)
- `greenmeter/src/app/globals.css` — design tokens + Tailwind (already correct)
- `greenmeter/src/app/(dashboard)/layout.tsx` — dashboard layout with Sidebar/TopBar/RollupBar
- `greenmeter/src/app/(dashboard)/settings/audit/page.tsx` — from Story 10.2
- `greenmeter/src/app/(dashboard)/settings/health/page.tsx` — from Story 10.3
- `greenmeter/src/app/screens/*.tsx` — all 10 screen components (imported, not modified)
- `greenmeter/src/app/AppShell.tsx` — legacy shell (no longer imported, kept for reference)

## Change Log
- 2026-05-06: Converted from AppShell state-switching to App Router file-based routing. Created 22 new files (pages, layouts, navigation utility, tests). Removed root page.tsx. All 324 tests pass.

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all tests passing (324/324, 0 regressions)
- 2026-05-06: Status changed to `review` — ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
