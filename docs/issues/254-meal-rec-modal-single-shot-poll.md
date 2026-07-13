# 254 — Meal Recommendation Modal "Poll Fallback" Fires Once After 3s, Then Never Again

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (UI)  
**Status:** Open

## Description

`MealRecommendationModal.vue` relies on the WebSocket run event to finish loading, with
a "fallback: poll if it stays loading too long" — but the fallback is a single
`setTimeout(…, 3000)`, not an interval. LLM recommendation runs typically take well over
3 seconds, so the one-shot check almost always sees `EXECUTING` and never checks again.
If the WS `run_update` is missed (reconnect, tab background, identity switch), the modal
spins forever — the same failure mode as fixed issue
[082](./082-meal-recommendation-modal-stuck-loading.md).

Also:

- `pollTimer` is not cleared in `onUnmounted` (only the loading-stage rotation is), so
  the timeout can fire and `$fetch` after the component is gone.
- `confirmSelection()` catches errors with only `console.error` — the user gets no
  toast when locking the meal fails; the modal just stays open.

## Affected Files

- `app/components/nutrition/MealRecommendationModal.vue` (~lines 592–626, 660–692)

## Acceptance Criteria

- Fallback polls repeatedly (with backoff and a hard timeout that surfaces an error
  state) until the run resolves.
- Poll timer cleared on unmount; confirm failure shows a toast.
