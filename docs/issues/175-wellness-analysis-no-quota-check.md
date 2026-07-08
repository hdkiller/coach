# 175 — Wellness Analysis No Quota Check

**Type:** Bug  
**Priority:** High  
**Area:** `ai, wellness`  
**Status:** Open

## Description

analyzeWellness calls generateStructuredAnalysis without checkQuota; task bypasses API quota limits.

## Steps to Reproduce

Trigger analyze-wellness directly beyond free-tier wellness quota.

## Affected Files

- `server/utils/services/wellness-analysis.ts`
- `trigger/analyze-wellness.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
