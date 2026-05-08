# Story 9.3: Knowledge Base

Status: complete

## Story

As a department data owner,
I want ESG standards reference material and intervention strategies,
so that I understand metrics and how to improve them.

## Acceptance Criteria

1. /knowledge page displays categorized ESG reference content
2. Content organized by framework (BRSR, ESRS, GRI) and topic
3. Search/filter capability within knowledge base
4. "Learn more" links from Console parameters navigate to relevant KB entry
5. Static content in v1 (no admin editing — that's v2)

## Tasks / Subtasks

- [x] Task 1: Create knowledge page (AC: #1, #2)
  - [x] Page at /src/app/(dashboard)/knowledge/page.tsx
  - [x] Category navigation (by framework and topic)
  - [x] Content display area with formatted entries
- [x] Task 2: Implement search/filter (AC: #3)
  - [x] Client-side filter on title/description
  - [x] Filter by framework selector
  - [x] Filter by topic/category
- [x] Task 3: Create static content structure (AC: #5)
  - [x] Define content schema (framework, category, title, definition, methodology, interventions)
  - [x] Create static MDX/JSON content files for key metrics
  - [x] Structure: framework -> category -> entries
- [x] Task 4: Link from parameter view (AC: #4)
  - [x] Add knowledge_base_ref field or derive from standard+section on parameters
  - [x] "Learn more" link in Console parameter detail navigates to relevant KB entry
  - [x] Deep-link routing to specific KB entries

### Review Findings

- [x] [Review][Patch] Radix Select crash on empty string SelectItem value — replaced with `__all__` sentinel [Knowledge.tsx]
- [x] [Review][Patch] `getEntriesByParamCode("")` returns all entries — added empty string guard [knowledgeBase.ts]
- [x] [Review][Patch] `getEntriesByParamCode` bidirectional startsWith too greedy — changed to delimiter-bounded matching [knowledgeBase.ts]
- [x] [Review][Patch] TooltipProvider instantiated per table row — hoisted to shared ancestor, memoized LearnMoreLink [KpiTable.tsx]
- [x] [Review][Patch] Filter state incomplete reset on framework change — now resets pillar and content type filters too [Knowledge.tsx]
- [x] [Review][Patch] `searchEntries` recomputed on every render — added useMemo [Knowledge.tsx]
- [x] [Review][Defer] Duplicate PILLAR_VARIANT/CONTENT_TYPE_VARIANT constants in KnowledgeEntryCard and KnowledgeDetailPanel — deferred, pre-existing pattern
- [x] [Review][Defer] DRY extraction of shared constants to shared module — deferred, low severity, acceptable in v1
- [x] [Review][Defer] KB-to-params navigation (`handleNavigateToParam`) goes to generic params page without paramCode context — deferred, params page does not yet support `?code=` filtering (Story 4.2 scope)

## Dev Notes

- Page: /src/app/(dashboard)/knowledge/page.tsx
- Content source: static MDX/JSON files or hardcoded content (v1 is static)
- Structure: framework -> category -> entries (definition, how to measure, intervention strategies)
- Search: client-side filter on title/description (simple for static content)
- Link from Console: each parameter can have a knowledge_base_ref field or derive from standard+section
- Content includes: metric definitions, measurement methodology, improvement strategies, regulatory context
- NO admin CRUD in v1 (per decisions-log: custom knowledge base entries deferred to v2)

### Depends On
- Story 4.2 (parameters exist to link from)

### References
- [Source: product-brief.md — Knowledge base]
- [Source: decisions-log.md — custom KB entries v2]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No issues encountered during implementation.

### Completion Notes List
- Replaced prototype Knowledge screen (inline styles, hardcoded data) with proper component architecture.
- Created typed knowledge base data model with 22 entries across BRSR, ESRS, GRI, and IFRS S2 frameworks.
- Content organized by framework and category (12 categories across E/S/G pillars).
- Each entry includes: definition, methodology, improvement strategies, regulatory context, tags, and related parameter codes.
- Framework tab navigation using Radix UI Tabs for easy framework-based browsing.
- Search across title, definition, methodology, and tags with combined filter support (memoized).
- Filters: framework (via tabs), pillar, topic/category, content type. All use `__all__` sentinel to avoid Radix Select empty string crash.
- Deep-linking via URL query param: `/knowledge?entry={entryId}` opens specific entry.
- "Learn more" BookOpen icon in KpiTable parameter column links to matching KB entries (memoized, single TooltipProvider).
- Bidirectional linking: KB entries reference param codes, and Console params link to matching KB entries.
- Delimiter-bounded prefix matching prevents false positive param code matches.
- 35 unit tests covering data integrity, all lookup functions, search/filter logic, and edge cases (empty strings, delimiter boundaries).
- Full test suite: 906 passed, 0 failed across 73 test files.
- No new TypeScript errors introduced (8 pre-existing errors unchanged).
- Code review: 6 patch findings fixed, 3 deferred, 16 dismissed as noise/non-issues.

### Implementation Plan
1. Created `src/config/knowledgeBase.ts` — typed content schema, 22 entries, framework metadata, categories, and search/filter utility functions.
2. Created `src/components/knowledge/KnowledgeEntryCard.tsx` — card component for entry display using Badge UI primitives.
3. Created `src/components/knowledge/KnowledgeDetailPanel.tsx` — sticky detail panel with definition, methodology, interventions, regulatory context, tags, and related parameters.
4. Rewrote `src/app/screens/Knowledge.tsx` — replaced prototype with proper architecture using Tabs, Select, PageHeader, Card UI components. Added framework tab navigation, search, multi-filter support, and deep-link handling via useSearchParams.
5. Updated `src/app/(dashboard)/knowledge/page.tsx` — added Suspense boundary for useSearchParams.
6. Modified `src/components/console/KpiTable.tsx` — added memoized LearnMoreLink component showing BookOpen icon that links to matching KB entries, single TooltipProvider.
7. Created `src/config/knowledgeBase.test.ts` — 35 tests covering data integrity, utility functions, and edge cases.

### File List
- `greenmeter/src/config/knowledgeBase.ts` (new) — Knowledge base data model, content entries, and search/filter functions
- `greenmeter/src/config/knowledgeBase.test.ts` (new) — 35 unit tests for knowledge base data and functions
- `greenmeter/src/components/knowledge/KnowledgeEntryCard.tsx` (new) — Entry card component
- `greenmeter/src/components/knowledge/KnowledgeDetailPanel.tsx` (new) — Detail panel component
- `greenmeter/src/app/screens/Knowledge.tsx` (modified) — Rewrote prototype with proper component architecture
- `greenmeter/src/app/(dashboard)/knowledge/page.tsx` (modified) — Added Suspense boundary for deep-linking
- `greenmeter/src/components/console/KpiTable.tsx` (modified) — Added memoized "Learn more" link to KB entries

## Change Log
- 2026-05-06: Implemented Story 9.3 — Knowledge Base with static content, framework navigation, search/filter, deep-linking, and Console Learn More links.
- 2026-05-06: Code review fixes — Radix Select sentinel values, delimiter-bounded param matching, empty string guard, filter reset, useMemo, TooltipProvider hoisting.

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `testing` — all tasks complete, 32 tests passing, full suite clean (no regressions)
- 2026-05-06: Status changed to `review` — code review passed (6 patches applied, 3 deferred), 35 tests passing, 906/906 tests green
- 2026-05-06: Status changed to `complete` — human review approved
