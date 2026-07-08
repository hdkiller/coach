# 139 — Fitness Index 90 Day Api Cap

**Type:** Bug  
**Priority:** High  
**Area:** `wellness, fitness`  
**Status:** Open

## Description

API hardcodes 90 day limit ignoring client query.

## Steps to Reproduce

YTD view truncated at 90 days.

## Affected Files

- `app/pages/fitness/index.vue`
- `server/api/wellness/index.get.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
