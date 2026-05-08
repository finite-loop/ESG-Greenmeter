# Story 3.1: Login Page & OAuth Flow

Status: complete

## Story

As a new user,
I want to sign in with Azure AD credentials,
so that I can access the platform.

## Acceptance Criteria

1. /login page renders with "Sign in with Microsoft" button
2. Clicking sign-in redirects to Azure AD OAuth consent
3. Successful callback for existing user → redirect to dashboard
4. Successful callback for user matching a pending invitation → create user + redirect to dashboard
5. Successful callback for unknown user → redirect to /access-denied
6. Sign-out destroys session and redirects to /login

## Tasks / Subtasks

- [x] Create login page component (AC: #1)
  - [x] Build `/src/app/(auth)/login/page.tsx` with centered card layout
  - [x] Add "Sign in with Microsoft" button with Microsoft icon
  - [x] Apply DM Sans + teal palette design system styling
- [x] Wire signIn/signOut from Auth.js (AC: #2, #6)
  - [x] Import `signIn('microsoft-entra-id')` from next-auth/react and attach to button click
  - [x] Create sign-out server action using `signOut()` with redirect to /login
- [x] Handle invitation matching logic in auth callback (AC: #3, #4, #5)
  - [x] In signIn callback, look up user by email in `users` table
  - [x] If user exists and is active, allow sign-in and redirect to dashboard
  - [x] If user exists with active=false (invited), activate user record and redirect to dashboard
  - [x] If user does not exist in DB, redirect to /access-denied
- [x] Create access-denied page (AC: #5)
  - [x] Build `/src/app/(auth)/access-denied/page.tsx` with informational message
  - [x] Include link back to /login

## Dev Notes

- Uses Auth.js `signIn('azure-ad')` and `signOut()` from `/src/lib/auth.ts`
- Login page is in `(auth)` route group — centered layout, no sidebar
- The JWT callback in auth.ts handles the logic of looking up user in DB
- If user doesn't exist but email matches `users` table with status='invited', create the user record
- Design: Match existing DM Sans + teal palette design system

### Depends On
- Story 1.3 (Auth.js configured)
- Story 2.3 (auth layout exists)

### References
- [Source: architecture.md#Authentication & Security]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 469 tests pass (42 test files), zero regressions
- No new TypeScript errors introduced (4 pre-existing errors in unrelated files)

### Completion Notes List
- Login page updated to client component using `signIn("microsoft-entra-id")` from next-auth/react
- Created server action `signOutAction()` in `/src/lib/auth-actions.ts` for sign-out with redirect to /login
- Wired sign-out into dashboard layout TopBar via `onSignOut` prop
- Updated `signIn` callback in auth.ts: unknown users redirect to /access-denied, inactive (invited) users get activated on first sign-in
- Created access-denied page with informational message and back-to-login link
- Auth tests added covering JWT claim setting and signIn callback logic patterns

### File List
- `src/app/(auth)/login/page.tsx` — modified (added client directive, signIn call, Microsoft icon)
- `src/app/(auth)/access-denied/page.tsx` — new (access denied page)
- `src/lib/auth-actions.ts` — new (server actions for signIn/signOut)
- `src/lib/auth.ts` — modified (invitation activation logic in signIn callback)
- `src/lib/auth.test.ts` — new (auth callback logic tests)
- `src/app/(dashboard)/layout.tsx` — modified (wired signOutAction to TopBar)

## Status Log
- 2026-05-06: Status changed to `in-progress` — picked up for implementation
- 2026-05-06: Status changed to `review` — all tasks complete, tests passing, ready for human review
- 2026-05-06: Status changed to `complete` — human review approved
