# Story 10.4: Integration Configuration

Status: complete

## Story

As a tenant administrator,
I want to configure external integration settings,
so that automated data sync works for my systems.

## Acceptance Criteria

1. /settings/integrations shows available integrations (SAP, Darwinbox, LLM) with status
2. Configuration form: API endpoint, auth details, sync schedule (cron)
3. Credentials saved via Key Vault reference, audit logged
4. "Test Connection" validates without saving data
5. GET /api/config/integrations returns configs with masked credentials

## Tasks / Subtasks

- [x] Task 1: Create integrations page (AC: #1, #2)
  - [x] Page at /src/app/(dashboard)/settings/integrations/page.tsx
  - [x] List available integrations (SAP, Darwinbox, LLM) with current status
  - [x] Configuration form: API endpoint, auth details, sync schedule (cron expression)
  - [x] Admin-only access
- [x] Task 2: Create config API endpoints (AC: #3, #5)
  - [x] GET /api/config/integrations — list configs with masked credentials (show last 4 chars only)
  - [x] POST /api/config/integrations — create or update integration config
  - [x] Audit log on save
  - [x] Storage: tenant_config table with integration_type, endpoint, schedule_cron, credential_ref
- [x] Task 3: Implement test-connection logic (AC: #4)
  - [x] POST /api/config/integrations/test — attempt connection, return success/fail
  - [x] Validate endpoint reachability and auth without saving data
  - [x] Return meaningful error messages on failure
- [x] Task 4: Implement credential handling (AC: #3)
  - [x] In v1: store credentials encrypted in DB (Key Vault integration is production hardening)
  - [x] Mask credentials in GET responses (only last 4 chars visible)
  - [x] Audit log credential changes

## Dev Notes

- Page: /src/app/(dashboard)/settings/integrations/page.tsx
- API: /src/app/api/config/integrations/route.ts — GET (list), POST (create/update)
- Test endpoint: POST /api/config/integrations/test — attempt connection, return success/fail
- Credential masking: only show last 4 chars of API keys in GET responses
- Storage: tenant_config table with integration_type, endpoint, schedule_cron, credential_ref
- In v1: credentials can be stored encrypted in DB (Key Vault integration is production hardening)
- Schedule format: standard cron expression (e.g., "0 2 * * *" for 2am daily)
- Integration types: 'sap', 'darwinbox', 'llm'
- Admin-only access

### Depends On
- Story 3.4 (user management / admin role)

### References
- [Source: architecture.md — Azure Key Vault]
- [Source: product-brief.md — API integration]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Implementation Plan
- Use existing `tenant_config` table with integration-specific keys (prefixed `integration_`)
- Create encryption utility (AES-256-GCM) for credential storage
- Create integration Zod schemas for validation
- Extend configRepository with integration-specific methods
- Create integrationService for business logic
- Create API routes: GET/POST /api/config/integrations, POST /api/config/integrations/test
- Replace placeholder integrations page with full UI

### Debug Log References
- No blocking issues encountered during implementation

### Completion Notes List
- Used existing `tenant_config` table — no new DB migration needed
- Credentials encrypted with AES-256-GCM (Node.js crypto), stored as colon-delimited hex (iv:authTag:ciphertext)
- ENCRYPTION_KEY env var added (optional in dev, required in production)
- Dev fallback key used when ENCRYPTION_KEY not set (logged as warning)
- Test connection uses HEAD request with 10s timeout; accepts 401/403 as "reachable" (server responds)
- Audit logging excludes raw credentials — only metadata (endpoint, schedule, type) is logged
- Admin-only access enforced via `withApiHandler({ roles: ['admin'] })`
- All 41 new tests pass (13 encryption + 9 service + 12 API route + 7 test-connection route)
- Full test suite: 1534 pass, 16 pre-existing failures in forecastService.test.ts (Story 7.3 in-progress)
- Zero TypeScript errors in new files

### File List
- `greenmeter/src/lib/encryption.ts` — NEW: AES-256-GCM encrypt/decrypt/mask utilities
- `greenmeter/src/lib/encryption.test.ts` — NEW: 13 unit tests for encryption
- `greenmeter/src/schemas/integration.ts` — NEW: Zod schemas and TypeScript types for integrations
- `greenmeter/src/services/integrationService.ts` — NEW: Business logic for integration config CRUD and connection testing
- `greenmeter/src/services/integrationService.test.ts` — NEW: 9 unit tests for integration service
- `greenmeter/src/app/api/config/integrations/route.ts` — NEW: GET/POST API routes
- `greenmeter/src/app/api/config/integrations/route.test.ts` — NEW: 12 API route tests
- `greenmeter/src/app/api/config/integrations/test/route.ts` — NEW: POST test-connection endpoint
- `greenmeter/src/app/api/config/integrations/test/route.test.ts` — NEW: 7 test-connection route tests
- `greenmeter/src/app/(dashboard)/settings/integrations/page.tsx` — MODIFIED: Replaced placeholder with full integration management UI
- `greenmeter/src/db/repositories/configRepository.ts` — MODIFIED: Added integration-specific methods (getIntegrationConfigs, getIntegrationConfig, upsertIntegrationConfig)
- `greenmeter/src/config/env.ts` — MODIFIED: Added ENCRYPTION_KEY env var
- `greenmeter/.env.example` — MODIFIED: Added ENCRYPTION_KEY example

### Review Findings

- [x] [Review][Decision] SSRF risk in test-connection endpoint — accepted: admin-only access is sufficient mitigation for v1
- [x] [Review][Patch] Dev fallback encryption key is all-zeros — FIXED: now generates random per-process key
- [x] [Review][Patch] ENCRYPTION_KEY hex validation missing — FIXED: added hex regex validation
- [x] [Review][Patch] IV/AuthTag length not validated in decrypt — FIXED: added length checks with descriptive errors
- [x] [Review][Patch] URL schema not restricted to http/https — FIXED: added .refine() to restrict to http(s)
- [x] [Review][Patch] Silent decryption failure in toResponse — FIXED: added logger.warn on decryption failure
- [x] [Review][Patch] authKey max length not bounded — FIXED: added .max(4096) to schema
- [x] [Review][Patch] clearTimeout not called on error paths in testConnection — FIXED: moved controller/timeout before try block
- [x] [Review][Defer] AC#3 Key Vault not implemented — v1 deferral documented in Dev Notes; credentials encrypted in DB instead. Production hardening.
- [x] [Review][Defer] HEAD request may not be universally supported — some APIs return 405 for HEAD. Could use GET with abort. Low priority.
- [x] [Review][Defer] Cron regex allows semantically invalid expressions — format validated but not semantic ranges. Low risk, schedule not executed here.
- [x] [Review][Defer] Repeated type assertions in page component — 7+ `as IntegrationConfig` casts. Use type guard function. Cosmetic.

## Change Log
- 2026-05-07: Implemented Story 10.4 — Integration Configuration (all 4 tasks completed)
- 2026-05-07: Code review completed — 1 decision-needed, 7 patch, 4 deferred, 28 dismissed
- 2026-05-07: All code review patches applied — 7 fixes, 1 decision accepted, 4 deferred

## Status Log
- 2026-05-07: Status changed to `in-progress` — picked up for implementation
- 2026-05-07: Status changed to `testing` — all tests passing (41 new tests, zero regressions)
- 2026-05-07: Status changed to `review` — code review passed, 7 patches applied, ready for human review
- 2026-05-08: Status changed to `complete` — human review approved
