# 091 — Workouts Overall Quality Wrong Metric Key

**Type:** Bug  
**Priority:** Medium  
**Area:** `workouts, performance`  
**Status:** Open

## Description

app/pages/workouts/index.vue

## Steps to Reproduce

Click Overall Quality on workouts scoreboard; modal empty while other metrics work.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/api/scores/explanation.get.ts`

## Suggested Fix

Add mapping for 'Overall Workout Performance' -> 'overall'.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
