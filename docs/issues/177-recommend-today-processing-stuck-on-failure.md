# 177 — Recommend Today Processing Stuck On Failure

**Type:** Bug  
**Priority:** High  
**Area:** `planning, ai`  
**Status:** Open

## Description

ActivityRecommendation left PROCESSING when task fails outside quota catch.

## Steps to Reproduce

Fail recommend-today task; recommendation row stuck PROCESSING.

## Affected Files

- `trigger/recommend-today-activity.ts`
- `server/api/recommendations/today.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
