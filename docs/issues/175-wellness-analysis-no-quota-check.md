# 175 — Wellness Analysis No Quota Check

**Type:** Bug  
**Priority:** High  
**Area:** `ai, wellness`  
**Status:** Fixed

> **Fixed (2026-07-08):** `analyzeWellness` calls `checkQuota(userId, 'wellness_analysis')` before `generateStructuredAnalysis` and marks records `QUOTA_EXCEEDED` on 429.

## Description

analyzeWellness calls generateStructuredAnalysis without checkQuota; task bypasses API quota limits.

## Steps to Reproduce

Trigger analyze-wellness directly beyond free-tier wellness quota.

## Affected Files

- `server/utils/services/wellness-analysis.ts`
- `trigger/analyze-wellness.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
