# 345 — Coaches lack nutrition / fueling views for athletes

**Priority:** Medium
**Type:** Enhancement / Gap
**Status:** Open
**Area:** `coaching, nutrition`

## Summary

With an ACTIVE relationship, coaches get fitness, readiness, zones, calendar, and workouts — but no coach-scoped nutrition APIs or UI. Privacy docs mention treating nutrition as sensitive coaching data, implying it is in scope, yet coaches cannot browse athlete fueling without Act As (also missing — 329).

## Evidence

- Coach athlete detail tabs: overview / calendar / zones
- No `/api/coaching/athletes/:id/nutrition*`
- Coach calendar paths do not surface nutrition
- `content/documentation/2.coaches/14.permissions-privacy.md` mentions nutrition

## Suggested Fix

Add read-only coach nutrition summary (or document explicitly out of scope). Depends partly on Act As product decision (329).

## Acceptance Criteria

- [ ] Product decision documented; if in scope, coach can review key fueling signals for a coached athlete
