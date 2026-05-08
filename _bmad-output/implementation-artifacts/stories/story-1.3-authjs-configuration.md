# Story 1.3: Auth.js v5 Configuration & Azure AD Provider

Status: complete

## Story

As a user,
I want to authenticate via Azure AD OAuth,
so that I can securely access the platform with my organization's identity provider.

## Acceptance Criteria

1. Auth.js v5 installed and configured in `/src/lib/auth.ts` and `/src/lib/auth.config.ts`
2. Azure AD provider configured with AUTH_AZURE_AD_* environment variables
3. `/src/app/api/auth/[...nextauth]/route.ts` handles OAuth flows
4. JWT strategy with custom claims: userId, tenantId, role, email
5. Root `middleware.ts` protects `/(dashboard)/*` and `/api/*` (except `/api/auth`)
6. Session callback maps user DB record (tenant + role) into JWT
7. `.env.example` documents all required auth vars

## Tasks / Subtasks

- [x] Task 1: Install Auth.js (AC: #1)
  - [x] `npm install next-auth@5`
- [x] Task 2: Create auth config (AC: #1, #2, #6)
  - [x] `/src/lib/auth.config.ts` — Azure AD provider
  - [x] `/src/lib/auth.ts` — NextAuth export with jwt+session callbacks
  - [x] jwt callback: lookup user in DB on sign-in, attach tenantId+role
  - [x] session callback: expose tenantId+role to client
- [x] Task 3: API route (AC: #3)
  - [x] `/src/app/api/auth/[...nextauth]/route.ts` — export {GET, POST} from handlers
- [x] Task 4: Root middleware (AC: #5)
  - [x] `/src/middleware.ts` — protect routes, redirect to /login
  - [x] Matcher: `["/(dashboard)/:path*", "/api/:path*"]` excluding `/api/auth`
- [x] Task 5: Type augmentation (AC: #4)
  - [x] `/src/types/next-auth.d.ts` — extend Session/JWT with tenantId, role, userId
- [x] Task 6: Env vars (AC: #7)
  - [x] Update `.env.example` with AUTH_SECRET, AUTH_AZURE_AD_CLIENT_ID, etc.
  - [x] Add auth vars to `/src/config/env.ts` Zod schema

## Dev Notes

### Auth.js v5 Key Patterns
- Use `next-auth@5` (NOT v4)
- Export `{ handlers, auth, signIn, signOut }` from `/src/lib/auth.ts`
- API route exports `handlers.GET` and `handlers.POST`
- Session strategy: `"jwt"` — stateless, no DB session table
- `auth()` function replaces `getServerSession()` from v4

### Role Assignment Logic
- User exists in DB → use stored tenantId + role
- User matches pending invitation email → create user record with invited role
- No match → redirect to /access-denied

### DO NOT
- DO NOT use `getServerSession` (v4 pattern)
- DO NOT store sessions in database (JWT only)
- DO NOT extract tenantId from OAuth claims (always from our DB)

### Depends On
- Story 1.1 (users table in schema)

### References
- [Source: architecture.md#Authentication & Security]
- [Source: architecture.md#Starter Template Evaluation — Auth.js v5 Selected]
- [Source: decisions-log.md#D2 — OAuth confirmed]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TypeScript type check passed with no errors (tsc --noEmit)

### Completion Notes List
- Auth.js v5 (next-auth@5.0.0-beta.31) installed and configured
- Azure AD provider uses MicrosoftEntraID from next-auth/providers/microsoft-entra-id
- auth.config.ts separated from auth.ts for Edge Runtime compatibility in proxy
- JWT callbacks use lazy DB import to prevent build-time DATABASE_URL errors
- JWT callbacks look up user in DB by email, attach tenantId and role
- Session callback exposes userId, tenantId, role to client
- signIn callback verifies user exists and is active, redirects to /access-denied otherwise
- Route protection uses proxy.ts (Next.js 16 convention, replaces deprecated middleware.ts)
- Auth.js auth() wrapper used in proxy for session checking
- Type augmentations extend Session and JWT interfaces with custom claims
- .env.example documents AUTH_SECRET, AUTH_AZURE_AD_CLIENT_ID, AUTH_AZURE_AD_CLIENT_SECRET, AUTH_AZURE_AD_TENANT_ID, AUTH_URL
- env.ts Zod schema validates all auth environment variables with lazy getEnv() pattern
- Build succeeds: tsc --noEmit passes, next build passes (proxy recognized)
- Vitest test framework installed and configured for project-wide testing
- 16 auth-specific unit tests pass covering: auth.config, env schema, proxy config, route handler, auth exports

### File List
- greenmeter/src/lib/auth.ts (created)
- greenmeter/src/lib/auth.config.ts (created)
- greenmeter/src/app/api/auth/[...nextauth]/route.ts (created)
- greenmeter/src/proxy.ts (created — Next.js 16 proxy convention)
- greenmeter/src/types/next-auth.d.ts (created)
- greenmeter/.env.example (created)
- greenmeter/src/config/env.ts (created)
- greenmeter/package.json (modified — next-auth, vitest, @vitejs/plugin-react added; test scripts added)
- greenmeter/vitest.config.ts (created — vitest configuration with path aliases and Next.js mocks)
- greenmeter/src/__tests__/auth.test.ts (created — 16 unit tests for auth configuration)

## Change Log
- 2026-05-05: Implemented all 6 tasks. Migrated from middleware.ts to proxy.ts (Next.js 16 convention). Lazy DB imports prevent build failures. Build and type checks pass.
- 2026-05-05: Added Vitest test framework, vitest.config.ts, and 16 unit tests covering auth.config, env schema, proxy config, route handler, and auth module exports. All 104 project tests pass.

## Status Log
- 2026-05-06: Status changed to `complete` — human review approved (batch approval)
