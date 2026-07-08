# 176 — Recommend Today Inline Wellness No Quota

**Type:** Bug  
**Priority:** High  
**Area:** `ai, planning`  
**Status:** Fixed

## Description

recommend-today-activity calls analyzeWellness inline without wellness_analysis quota check.

## Steps to Reproduce

Daily recommendation triggers extra wellness AI call without quota.

## Affected Files

- `trigger/recommend-today-activity.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
