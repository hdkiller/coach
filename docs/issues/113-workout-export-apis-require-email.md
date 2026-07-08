# 113 — Workout Export Apis Require Email

**Type:** Bug  
**Priority:** Medium  
**Area:** `workouts, backend`  
**Status:** Open

## Description

server/api/workouts/[id]/export/gpx.get.ts

## Steps to Reproduce

Auth with id-only session; GET workout works but GPX returns 401/404.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/api/workouts/[id]/intervals.get.ts`

## Suggested Fix

Use session.user.id consistently like other workout routes.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
