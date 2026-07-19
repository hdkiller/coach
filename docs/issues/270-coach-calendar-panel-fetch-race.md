# 270 — Coach calendar panel fetch race on fast navigation

**Priority:** Medium  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, calendar, frontend`

## Summary

`fetchPanel` in `calendar.vue` has no request sequencing or abort. Clicking week navigation quickly lets a slower, older response overwrite a newer one — wrong week's data shown in primary/secondary lanes.

## Steps to Reproduce

1. Open `/coaching/calendar` with an athlete selected.
2. Rapidly click previous/next week (or switch athletes while pending).
3. Panel occasionally shows workouts from the wrong week.

## Expected Behavior

- Only the latest in-flight request updates `panelState[panel].data`.

## Actual Behavior

```ts
// calendar.vue ~L793-824
panelState[panel].data = await $fetch(...) // no generation token
```

## Affected Files

- `app/pages/coaching/calendar.vue` — `fetchPanel`

## Suggested Fix

- Monotonic request token per panel: increment before fetch, ignore response if token stale.
- Or `AbortController` cancel prior fetch on new navigation.

## Acceptance Criteria

- [ ] Rapid week navigation always shows data matching current week/athlete
- [ ] No regression on error toasts or loading state
- [ ] Works for both primary and secondary split-view panels
