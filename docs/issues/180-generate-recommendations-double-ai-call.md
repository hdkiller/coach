# 180 — Generate Recommendations Double Ai Call

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, planning`  
**Status:** Fixed

## Description

Second deduplication sweep AI call always runs with no quota or skip guard.

## Steps to Reproduce

Each Update Recommendations costs 2x LLM calls.

## Affected Files

- `trigger/generate-recommendations.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
