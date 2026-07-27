# 381 — A 15:00 "Snack" slot renders as a second "Lunch"

**Type:** Bug
**Priority:** Medium
**Area:** `frontend`, `backend`, `nutrition`
**Status:** Fixed

## Symptom

The weekly fueling script shows two windows both headed **"Lunch"** — one at 12:00 and one at
15:00 — for an athlete whose meal pattern is `Breakfast 07:00, Lunch 12:00, Dinner 18:00,
Snack 15:00` (Europe/Budapest).

## What was actually verified

A previous investigation attributed this to `getMealSlotName` mislabelling 15:00, and proposed
widening its hour bands. Checked against the code and the production data, **that diagnosis is
wrong in its causal step and its proposed fix is the wrong lever.**

What is true:

- `getMealSlotName` does put 15:00 in the lunch band (`hour >= 11 && hour < 16`). Confirmed.
- `buildWindowLabel` has preferred `window.slotName` over that time-of-day fallback since
  `54ef94d2` (2026-02-14). It does **not** override the slot name.
- Rebuilding the day with the athlete's exact production meal pattern produces the **correct**
  labels — `Breakfast / Lunch / Snack / Dinner`. The current generator does not have this bug.

What the production record shows (read-only query, plan updated 2026-07-27T06:00Z — not stale):

```
key=DAILY_BASE:breakfast slotName="Breakfast" label="Breakfast"
key=DAILY_BASE:lunch     slotName="Lunch"     label="Lunch"
key=DAILY_BASE:snack     slotName="Snack"     label="Lunch"   <-- disagree, same object
key=DAILY_BASE:dinner    slotName="Dinner"    label="Dinner"
```

Every day of the stored week carries the same mismatch. So a build that predates the `slotName`
preference wrote these labels, and **the correct value has been sitting next to the wrong one ever
since.** The label was never repaired because two places prefer the stored label over the slot name.

That is the defect worth fixing, and it is the same shape as the rest of this review: the system
knew, and discarded it at a boundary.

## Root cause

**1. The renderer picks the wrong field.** `WeeklyPlanDashboard.vue`:

```ts
const raw = String(window.label || window.slotName || window.type || 'Window')
```

`label` is a derived display string. `slotName` is the athlete's own name for the slot and the value
the window key is built from. For a baseline window the derived string was winning over the truth.

**2. The server lets a stale label survive regeneration.** `metabolicService.ts`:

```ts
label: (w as any).label || this.buildWindowLabel(w, timezone)
```

`buildWindowLabel` would have returned "Snack", but it was only consulted when no label existed. A
window labelled once from the time of day kept that label forever.

## Fix

- `app/utils/nutrition-window-label.ts` (new, extracted so it is testable): for `DAILY_BASE`
  windows `slotName` wins; workout windows keep the richer derived label, since `buildWindowLabel`
  composes `Pre-Workout ${slotName}` and preferring the bare slot name there would drop the session
  context.
- `metabolicService.resolveWindowDisplayLabel` recomputes whenever the window has a slot name, and
  falls back to the stored label only when there is nothing to check it against.

Both are display-layer fixes: **existing stored plans render correctly with no regeneration.**

## Why not widen the `getMealSlotName` bands

The proposed alternative — make 14:00–17:00 return `'Snack'` — tunes a constant to hide a
precedence bug. It would not fix any stored plan, it would mislabel an athlete who genuinely eats
lunch at 15:00 and has no snack slot, and it leaves the same failure available at every other hour
boundary. The bands are only a fallback for windows with no configured slot name, which is the one
case where a guess is all there is. Left unchanged.

## Tests

- `tests/unit/app/utils/nutrition-window-label.test.ts` (8)
- `tests/unit/server/utils/services/metabolicService.test.ts` — 4 added

Mutation-tested: restoring label-first precedence on either side fails the relevant tests, and
making `buildWindowLabel` ignore `slotName` fails them too. One test initially passed against a
slot-name-first-everywhere variant and was extended to pin that a workout window keeps its composed
label.
