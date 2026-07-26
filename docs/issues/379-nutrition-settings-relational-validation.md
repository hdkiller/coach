# 379 — Nutrition settings accept self-contradictory combinations

**Type:** Bug
**Priority:** Medium
**Area:** `backend`, `nutrition`, `settings`
**Status:** Fixed

## Description

`server/api/profile/nutrition.post.ts` validated every nutrition setting independently with a Zod
schema. Ranges were enforced correctly, but no rule related fields to each other, so the API
accepted combinations that make the fueling model behave nonsensically. These are the inputs to
every downstream calculation.

## 1. Duplicate meal-slot names collide on the window key

`mealPattern: z.array(z.object({ name: z.string(), time: z.string() }))` — no uniqueness constraint.

Two slots named "Lunch" produced two windows with the **same** `windowKey`:

```
window keys: [ 'DAILY_BASE:lunch', 'DAILY_BASE:lunch', 'DAILY_BASE:dinner' ]
unique? false
```

`NutritionPlanMeal` is unique on `(planId, date, windowType)`, so locking a meal against the second
slot overwrote the first — exactly the collapse that issue 378 (#10) fixed for workout windows,
reachable again through settings.

**This is live in production.** An audit of all 146 `UserNutritionSettings` rows (read-only) found
**2 users** with a duplicated "Snack" slot. The most likely path is the settings UI itself:
`addMeal()` in `NutritionSettings.vue` inserts a slot literally named "New Meal" every time, so
clicking Add twice is enough.

Two further variants of the same defect turned up while fixing it:

- A name with no alphanumeric characters (e.g. `☕️`) produced the key `DAILY_BASE:` — an empty
  slug that nothing can be matched against, and that collides with every other such name.
- `day-plan.ts` and `nutritionPlanService.toDailyBaseWindowKey` each had their **own** slugifier,
  and they disagreed on trailing punctuation (`'Lunch!'` → `lunch` vs `lunch-`). The service's copy
  is the fallback for legacy windows that carry no `windowKey`, so a meal locked against such a
  slot silently stopped matching its window.

## 2. Fuel-state triggers can be inverted, making a state unreachable

`fuelState1Trigger` and `fuelState2Trigger` are each `min(0).max(1)` with no ordering rule.
`resolveDayFuelState` tests them in sequence:

```ts
if (weightedIntensity > (profile.fuelState2Trigger || 0.85)) state = 3
else if (weightedIntensity > (profile.fuelState1Trigger || 0.7)) state = 2
```

With `fuelState1Trigger: 0.9, fuelState2Trigger: 0.5`, every day above 0.5 is state 3 and state 2 is
unreachable:

```
intensity 0.55 -> fuel state 3
intensity 0.70 -> fuel state 3
intensity 0.95 -> fuel state 3
```

The athlete gets performance-day carbohydrate targets for easy rides.

## 3. Carb ranges can invert or overlap

`fuelState1Min` may exceed `fuelState1Max`, and `fuelState3Min` may sit below `fuelState1Max`, so a
harder day can be prescribed fewer carbohydrates than an easier one. `resolveDayFuelState` averages
`(min + max) / 2`, which silently produces a meaningless midpoint for an inverted range.

## 4. Meal-slot times are unvalidated strings

`time: z.string()` accepts anything, and the failure is worse than "invalid":

- `'25:00'` or `'12:99'` build an invalid `Date`, which `metabolicService` filters out — the meal
  slot **silently disappears** from the plan with no error surfaced.
- `'1200'` or `'noon'` fall through `buildZonedDateTimeFromUtcDate`'s fallback and become **noon**,
  silently moving the meal rather than dropping it.

Either way the athlete gets a plan that does not match the schedule they saved.

## The fix

### Validation (`server/utils/nutrition/settings-validation.ts`, new)

`validateMealPattern` — unique names (compared on the _slug_, so `'Post ride'` and `'post-ride!'`
collide as they would downstream), non-empty names, `HH:mm`/`HH:mm:ss` times.

`validateFuelStates` — `fuelState1Trigger < fuelState2Trigger`, `min <= max` within each state, and
non-decreasing min and max across states. Equality is allowed throughout: two states fuelled alike
is unusual but coherent, only a decrease is an error.

Wired into `nutrition.post.ts` after the shape check. Two things it gets right that a plain
`superRefine` would not:

- It runs against the **effective** settings — the patch merged over what is stored. The endpoint
  accepts partial updates, so a request that moves only `fuelState1Trigger` can invert it against a
  `fuelState2Trigger` that never appears in the body.
- Unset fields fall back to the same constants `resolveDayFuelState` uses, so validation reasons
  about the numbers the model will actually apply rather than about `undefined`.

The 400 now carries readable prose in `message` (which `NutritionSettings.vue` renders) alongside
the machine-shaped issue list in `data`.

### Collision-proof keys (`server/utils/nutrition-domain/day-plan.ts`)

`slugifySlot` is exported and falls back to `slot` when a name has no usable characters.
`assignSlotWindowKeys` assigns keys across the whole slot list, appending `#2`, `#3` … to repeats in
the same style the workout windows use — the first occurrence keeps the bare key it has always had,
so no existing row is renamed. `nutritionPlanService.toDailyBaseWindowKey` now calls the same
`slugifySlot` instead of its own copy.

Keys are assigned **before** the workout-overlap filter, so a slot's identity depends on the meal
pattern alone. Assigned after, a morning workout that swallowed the first "Snack" would promote the
second one to the first's key and re-point any meal locked against it.

### Blast radius

The audit found no production user whose stored fuel-state values the new rules reject, so nobody
is locked out of saving by the trigger or range checks. The 2 users with a duplicated "Snack" must
rename one slot before they can save settings again; the error names the offending meal. Their
plans keep working meanwhile — `assignSlotWindowKeys` gives the second slot its own key. One
one-time effect for them: a lock previously stored under the collided `DAILY_BASE:snack` now
attaches to the first snack only, which is a strict improvement over one of the two being
unreachable.

## Tests

- `tests/unit/server/utils/nutrition/settings-validation.test.ts` (19)
- `tests/unit/server/api/profile/nutrition.post.test.ts` (7) — includes both directions of the
  partial-update merge
- `tests/unit/server/utils/nutrition-domain/day-plan.test.ts` — 4 added for window keys
- `tests/unit/server/utils/services/nutritionPlanService.test.ts` — 1 added for slugifier parity

Every one was mutation-tested: the fix was reverted, the test confirmed failing, then restored. Two
tests passed against deliberately broken code on the first attempt and were rewritten — the
partial-update test used a stored value that happened to equal the fallback, and the range tests
never exercised the equality boundary.
