# 182 — Analyze Wellness No Ownership Check

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, wellness`  
**Status:** Open

## Description

analyze-wellness task never verifies wellness.userId matches payload userId.

## Steps to Reproduce

Mis-tagged task could analyze wrong user's wellness.

## Affected Files

- `trigger/analyze-wellness.ts`
- `server/utils/services/wellness-analysis.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
