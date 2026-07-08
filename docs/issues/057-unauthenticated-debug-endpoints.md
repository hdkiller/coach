# 057 — Unauthenticated debug endpoints expose system info

**Type:** Bug  
**Priority:** High  
**Area:** `backend`, `infra`  
**Status:** Fixed

> **Fixed (2026-07-08):** Added shared `requireAdmin()` guard to all `/api/debug/*` routes and `auth` + `admin` middleware on debug pages.

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

Added `requireAdmin()` in `server/utils/auth-guard.ts` and applied to all debug API routes. Debug UI pages use `middleware: ['auth', 'admin']`.

## Acceptance Criteria

- [x] Debug endpoints return 403 for unauthenticated/non-admin requests
- [x] Legitimate admin debug access still works in dev/staging
