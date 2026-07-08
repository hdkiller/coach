# 177 — Recommend Today Processing Stuck On Failure

**Type:** Bug  
**Priority:** High  
**Area:** `planning, ai`  
**Status:** Fixed

> **Fixed (2026-07-08):** `recommend-today-activity` wraps generation in try/catch and sets `ActivityRecommendation.status = FAILED` on any uncaught error.

## Description

ActivityRecommendation left PROCESSING when task fails outside quota catch.

## Steps to Reproduce

Fail recommend-today task; recommendation row stuck PROCESSING.

## Affected Files

- `trigger/recommend-today-activity.ts`
- `server/api/recommendations/today.post.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
