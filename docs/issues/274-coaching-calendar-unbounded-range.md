# 274 — Coaching athlete calendar accepts unbounded date range

**Priority:** Medium  
**Type:** Bug / Performance  
**Status:** Fixed  
**Area:** `coaching, calendar, backend`

## Summary

`GET /api/coaching/athletes/[id]/calendar` accepts arbitrary `startDate`/`endDate` with no max span, no `start <= end` validation. An authenticated coach can request years of enriched calendar data in one call.

## Steps to Reproduce

1. As coach with athlete access, call calendar API with `startDate=2020-01-01&endDate=2030-01-01`.
2. Server processes full range via `getCalendarDataForUser`.

## Expected Behavior

- Validate `startDate <= endDate`.
- Cap range (e.g. 90 or 180 days) matching athlete calendar UI limits.

## Actual Behavior

- Only `isNaN` check on dates; no span limit.

## Affected Files

- `server/api/coaching/athletes/[id]/calendar.get.ts`

## Suggested Fix

- Zod schema: `endDate - startDate <= MAX_DAYS`, `startDate <= endDate`.
- Return 400 with clear message.

## Acceptance Criteria

- [ ] Inverted range returns 400
- [ ] Range > cap returns 400
- [ ] Normal week/month requests unchanged
