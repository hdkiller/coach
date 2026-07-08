# 057 — Unauthenticated debug endpoints expose system info

**Type:** Bug  
**Priority:** High  
**Area:** `backend`, `infra`  
**Status:** Open

## Description

Several debug API routes have no session or admin check and are callable by unauthenticated clients in any environment where they are deployed:

- `server/api/debug/system.get.ts` — Node version, memory usage, CPU count, uptime
- `server/api/debug/config-test.get.ts` — whether webhook secrets are loaded
- `server/api/debug/sentry.post.ts` — trigger Sentry test events

Only `debug/workouts.get.ts` checks auth.

## Steps to Reproduce

1. `GET /api/debug/system` without authentication.
2. Response includes system diagnostics.

## Expected Behavior

- Debug routes require admin session or are disabled in production.

## Actual Behavior

- Public access to internal diagnostics.

## Affected Files

- `server/api/debug/system.get.ts`
- `server/api/debug/config-test.get.ts`
- `server/api/debug/sentry.post.ts`

## Suggested Fix

Add `requireAuth` with admin role, or gate behind `NODE_ENV === 'development'`.

## Acceptance Criteria

- [ ] Debug endpoints return 401/403 for unauthenticated requests in production
- [ ] Legitimate admin debug access still works in dev/staging
