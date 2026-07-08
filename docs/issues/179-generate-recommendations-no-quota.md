# 179 — Generate Recommendations No Quota

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, planning`  
**Status:** Fixed

## Description

generate-recommendations task and API lack quota enforcement.

## Steps to Reproduce

Unbounded recommendation regeneration triggers.

## Affected Files

- `trigger/generate-recommendations.ts`
- `server/api/recommendations/generate.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
