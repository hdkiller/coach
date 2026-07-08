# 181 — Analyze Plan Adherence No Quota Timeout

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, planning`  
**Status:** Open

## Description

analyze-plan-adherence has no checkQuota or timeoutMs on AI call.

## Steps to Reproduce

Plan adherence analysis bypasses quota and can hang.

## Affected Files

- `trigger/analyze-plan-adherence.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
