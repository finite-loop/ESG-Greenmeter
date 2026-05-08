# Story 1.9: CI/CD Pipeline

Status: complete

## Story

As a developer,
I want a GitHub Actions pipeline that validates code on PR and deploys to staging with E2E verification,
so that quality is enforced and deployments are safe.

## Acceptance Criteria

1. `.github/workflows/ci.yml` runs lint + typecheck + vitest on every PR
2. `.github/workflows/deploy.yml` builds and deploys to Azure App Service staging on merge to main
3. Deploy pipeline runs Playwright E2E against staging before manual promotion
4. Migrations run before app starts in deployed environments
5. Pipeline uses Node.js 22 and caches node_modules

## Tasks / Subtasks

- [x] Task 1: Create CI workflow (AC: #1, #5)
  - [x] `.github/workflows/ci.yml`
  - [x] Trigger: pull_request to main
  - [x] Steps: checkout → setup Node 22 → npm ci (cached) → lint → typecheck → vitest
- [x] Task 2: Create Deploy workflow (AC: #2, #3, #4)
  - [x] `.github/workflows/deploy.yml`
  - [x] Trigger: push to main
  - [x] Steps: checkout → npm ci → build (next build standalone) → deploy to staging slot → run Playwright → manual approval gate → swap to prod
- [x] Task 3: Configure Playwright (AC: #3)
  - [x] `playwright.config.ts` at project root
  - [x] Base URL configurable via env for staging
- [x] Task 4: Configure Vitest (AC: #1)
  - [x] `vitest.config.ts` at project root
  - [x] Include pattern: `src/**/*.test.ts`, `tests/integration/**/*.test.ts`
- [x] Task 5: Startup migration script (AC: #4)
  - [x] Entry point that runs `drizzle-kit migrate` before `next start`
  - [x] Or: Azure App Service startup command: `npm run db:migrate && npm run start`

## Dev Notes

### CI Workflow Structure
```yaml
name: CI
on: pull_request
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test
```

### Deploy Workflow Key Points
- Build standalone Next.js output (`output: 'standalone'` in next.config.ts)
- Deploy to Azure App Service using `azure/webapps-deploy@v3`
- Staging slot for zero-downtime deploys
- Playwright tests run AGAINST staging URL (not localhost)
- Manual approval via GitHub Environments protection rules

### Package.json Scripts Needed
```json
{
  "lint": "next lint",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "build": "next build",
  "start": "next start",
  "db:migrate": "tsx scripts/migrate.ts"
}
```

### Depends On
- Story 1.1 (vitest needs something to test; migrate script exists)

### References
- [Source: architecture.md#Infrastructure & Deployment — CI/CD pipeline]
- [Source: architecture.md#Starter Template Evaluation — Vitest + Playwright Selected]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Created CI workflow (`.github/workflows/ci.yml`) — triggers on PR to main, runs lint + typecheck (`tsc --noEmit --skipLibCheck`) + vitest with Node 22 and npm cache
- Created Deploy workflow (`.github/workflows/deploy.yml`) — triggers on push to main, builds app, deploys to Azure App Service staging slot, runs Playwright E2E against staging, then manual approval gate before swapping to production
- Installed `@playwright/test` and created `playwright.config.ts` with configurable `PLAYWRIGHT_BASE_URL` for staging
- Added `test:e2e` script to package.json
- Created smoke E2E test in `tests/e2e/smoke.test.ts`
- Updated `vitest.config.ts` to include `tests/integration/**/*.test.ts` pattern
- Migration script (`scripts/migrate.ts`) and `db:migrate` already existed from story 1.1 — deploy workflow uses `npm run db:migrate && npm run start` as startup command
- Concurrency controls on both workflows to prevent race conditions
- Full test suite: 294 tests across 26 files, zero regressions

### File List
- `.github/workflows/ci.yml` (new)
- `.github/workflows/deploy.yml` (new)
- `greenmeter/playwright.config.ts` (new)
- `greenmeter/tests/e2e/smoke.test.ts` (new)
- `greenmeter/vitest.config.ts` (modified — added integration test include pattern)
- `greenmeter/package.json` (modified — added @playwright/test, test:e2e script)

## Change Log
- 2026-05-05: Implemented CI/CD pipeline with GitHub Actions CI + Deploy workflows, Playwright config, vitest integration pattern

## Status Log
- 2026-05-05: Status changed to `in-progress` — picked up for implementation
- 2026-05-05: Status changed to `review` — all tasks complete, 294 tests passing, ready for human review
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
