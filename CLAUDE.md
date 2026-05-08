# GreenMeter AI — Project Instructions

## Project Overview

GreenMeter AI is a multi-tenant ESG reporting and intelligence platform. Tech stack: Next.js 16 + React 19 + TypeScript (strict) + Tailwind CSS 4 + Drizzle ORM + PostgreSQL 16 + Auth.js v5 + pg-boss + Azure (App Service, Blob Storage, Document Intelligence).

The application code lives in `greenmeter/` subdirectory.

## Before Implementing Any Story

1. **Read the implementation sequence** to understand dependencies and current progress:
   ```
   _bmad-output/implementation-artifacts/stories/implementation-sequence.md
   ```

2. **Check story status** by scanning story files in:
   ```
   _bmad-output/implementation-artifacts/stories/story-*.md
   ```
   - `Status: ready-for-dev` — available for implementation
   - `Status: in-progress` — currently being worked on
   - `Status: testing` — implementation done, tests passing, awaiting code review
   - `Status: review` — code review passed, awaiting human approval
   - `Status: complete` — done (human approved)

3. **Handle existing statuses before picking new work:**
   - If any story is in `review` status, review it first — verify acceptance criteria are met, then mark it `complete`
   - If any story is in `in-progress` status, skip it (it is already being built in another session) and move on to the next available story

4. **Pick the next story** using these rules:
   - Choose the lowest-numbered `ready-for-dev` story whose dependencies (listed in "Depends On" section) are ALL `complete` or `review`
   - Never skip ahead — dependency order prevents integration issues
   - If multiple stories are unblocked, prefer the one on the critical path (see implementation-sequence.md)

5. **Read the architecture document** before writing code:
   ```
   _bmad-output/planning-artifacts/architecture.md
   ```
   Follow all naming conventions, patterns, and anti-patterns defined there.

## Story Implementation Workflow

When implementing a story:
1. Set the story's Status to `in-progress`
2. Read the full story file — it contains acceptance criteria, tasks, dev notes, and file paths
3. Implement all tasks following the architecture patterns
4. **Run tests** — execute the test suite (`npm test`) and fix any failures; add new tests for the implemented functionality
5. Set the story's Status to `testing` once tests pass
6. **Run code review** — use the `bmad-code-review` skill to review all changes; address any critical or high-severity findings
7. Set the story's Status to `review` — ready for human review
8. Verify all acceptance criteria are met
9. Set the story's Status to `complete` only after human approval
10. Record files created/modified in the story's "File List" section

## Story Status Updates (Mandatory)

**You MUST update the story file's `Status` field immediately at each transition.** Do not batch status changes — update the file the moment the status changes.

| Transition | New Status | When to set |
|---|---|---|
| Picked up for work | `Status: in-progress` | Before writing any implementation code |
| Code changes made | `Status: in-progress` | Already set; update the "File List" section with modified files as you go |
| Tests passing | `Status: testing` | After all tests pass (existing + new tests for the story) |
| Code review done | `Status: review` | After code review findings are addressed and no critical issues remain |
| Review approved | `Status: complete` | After human reviewer confirms the work |
| Review rejected | `Status: in-progress` | Revert to in-progress and address feedback |

### Rules
- **Never leave a story without an accurate status** — if you stop mid-implementation, it stays `in-progress`
- **Update the file on disk**, not just in memory — use the Edit tool to change the `Status:` line in the story markdown front-matter
- **Record progress incrementally** — as each task within the story is completed, check it off in the tasks list (`- [x]`) and update the "File List" section
- **Add a note on status change** — append a brief line to a "Status Log" section at the bottom of the story file:
  ```
  ## Status Log
  - YYYY-MM-DD: Status changed to `in-progress` — picked up for implementation
  - YYYY-MM-DD: Status changed to `testing` — all tests passing
  - YYYY-MM-DD: Status changed to `review` — code review passed, ready for human review
  - YYYY-MM-DD: Status changed to `complete` — human review approved
  ```

## Key Architecture Rules (Always Follow)

- **Middleware chain:** auth → tenant → role → handler → audit (every API route)
- **Never pass tenantId in request body** — always extract from JWT session
- **Service layer pattern:** route handler → service → repository → database
- **Naming:** DB=snake_case, API=camelCase, Components=PascalCase, Zod=camelCaseSchema
- **Error format:** `{ error: { code, message, details? } }` with appropriate HTTP status
- **Audit:** every write operation logged automatically
- **RLS:** every query filtered by tenant via PostgreSQL session variable
- **No console.log** — use structured logger
- **No `any` type** — use proper types or `unknown` with narrowing

## Key File Locations

| What | Where |
|---|---|
| Stories | `_bmad-output/implementation-artifacts/stories/` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| Schema design | `_bmad-output/planning-artifacts/storage-schema-design.md` |
| Epic breakdown | `_bmad-output/planning-artifacts/epics.md` |
| App source | `greenmeter/src/` |
| DB schema | `greenmeter/src/db/schema/` |
| API routes | `greenmeter/src/app/api/` |
| Services | `greenmeter/src/services/` |
| Components | `greenmeter/src/components/` |

## Next.js 16 Warning

Read `greenmeter/AGENTS.md` — Next.js 16 has breaking changes from training data. Always check `node_modules/next/dist/docs/` before using Next.js APIs.
