# 271 — Coaching overview compliance grid uses server timezone

**Priority:** Medium  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, overview, backend`

## Summary

`overview.get.ts` builds the compliance week with `startOfWeek(new Date())` and `isSameDay` in the **server's** timezone. Coaches and athletes in other timezones see workouts on the wrong day column; "missed" cutoff shifts.

## Steps to Reproduce

1. Coach in UTC+10, server in UTC.
2. Athlete completes workout late local evening (still "today" locally, previous UTC day).
3. Overview grid places workout on wrong weekday or marks missed incorrectly.

## Expected Behavior

- Week boundaries and day columns use coach or athlete timezone (consistent with calendar elsewhere).

## Actual Behavior

- `server/api/coaching/overview.get.ts` ~L38, ~L87-90 — server-local `Date` + `isSameDay`.

## Suggested Fix

- Accept `timezone` query param or derive from coach profile.
- Use `date-fns-tz` or existing project TZ helpers for week start and day bucketing.

## Acceptance Criteria

- [ ] Workout on local Monday appears in Monday column for coach in non-UTC TZ
- [ ] Missed/pending cutoff aligns with athlete's calendar day
- [ ] Fallback to UTC when TZ unknown
