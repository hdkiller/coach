# 380 — Nutrition review: remaining surfaces

**Type:** Bug
**Priority:** Medium
**Area:** `frontend`, `backend`, `nutrition`
**Status:** Fixed (except #7, see below)

Findings from completing the review the previous session cut short (see
`docs/issues/HANDOFF-nutrition-review.md`): `WindowBlock.vue`, the grocery list, photo capture,
`connect-yazio`, nutrition emails, `DailyCheckinModal`, and `ai-tools/nutrition.ts`.

## 1. "Coach Suggests" recommended food the athlete told us they cannot eat

`app/components/nutrition/WindowBlock.vue`

```ts
if (props.targetCarbs > 80)
  return `Focus on high-glycemic carbs. Recommendation: 1 large bagel with jam and a banana.`
if (props.targetCarbs > 40) return `Moderate fueling needed. Try 1 bowl of oatmeal with honey.`
```

Chosen from `targetCarbs` alone. `WindowBlock` never received `dietaryProfile`, `foodAllergies`,
`foodIntolerances` or `lifestyleExclusions`, while `mealRecommendationService` filters on all four —
so the constraint was collected and honoured everywhere except this fallback. Bagel, oatmeal and
honey were suggested to coeliac and vegan athletes.

It renders whenever a non-`DAILY_BASE` window has nothing logged and is not already HIT. Only 1% of
production days carry logged food, so for most athletes this is what a workout window showed
essentially every day.

**Fixed:** `app/utils/nutrition-suggestions.ts` tags each suggestion with the constraint values that
rule it out and falls back to wording that names no food. The rule is deliberately conservative —
a named suggestion needs constraints to be _known_ and non-conflicting, because "we were not told"
is not evidence that a food is safe. Constraints are plumbed from `nutritionSettings` through
`[id].vue` → `FuelingTimeline` → `WindowBlock`, and directly in `NutritionFuelingCard`.

## 2. Custom meal-slot names lost their scheduled-meal heading

`app/components/nutrition/WindowBlock.vue`

```ts
const scheduledMeals = (props.meals || []).map((m) => m.toLowerCase())
const order = ['breakfast', 'lunch', 'dinner', 'snacks']
return order.filter((meal) => groups[meal]?.length > 0 || scheduledMeals.includes(meal))
```

`props.meals` holds the athlete's **own** slot names (`nutrition-timeline.ts`,
`window.meals = windowMeals.map((m) => m.name)`) — arbitrary free text. `order` is four hardcoded
English buckets, so any name outside that set was filtered out before it could render. An athlete
who renamed a slot to "Elevenses", or whose slots are in their own language, lost the subheading and
the empty-scheduled-slot row entirely.

**Fixed:** extracted to `app/utils/nutrition-meal-groups.ts`, which keys on the union of populated
buckets and scheduled slots. Custom slots sort after the fixed buckets in meal-pattern order.

Writing the fix surfaced a regression it would otherwise have introduced: the shipped default meal
pattern names the slot **"Snack"** while the DB bucket is **"snacks"**, so every default athlete
would have seen a populated "Snacks" heading beside an empty "Snack" one. A small alias table folds
the known synonyms onto their bucket.

## 3. Meal bucket boundaries only recognised English slot names

`server/api/nutrition/index.post.ts`

```ts
const breakfastTime = timeToMinutes(
  pattern.find((p) => p.name.toLowerCase() === 'breakfast')?.time || '07:00'
)
```

Items logged with no explicit `meal` are bucketed by proximity to these four times. The lookup
matched the slot **name** literally, so an athlete whose slots are named in any language other than
English silently fell back to 07:00 / 12:00 / 18:00 / 15:00 instead of the times they configured.

**Fixed:** resolved through the shared `pickMealScheduledTime`, which tries the name, then known
aliases, then the slot's position in the pattern.

## 4. The AI logging tool discarded a custom slot's configured time

`server/utils/ai-tools/nutrition.ts`

`log_nutrition_meal` accepts custom slot names and maps them to the `snacks` bucket, preserving
intent in the item name (`[Elevenses] Scone`). It then resolved the timestamp with:

```ts
normalizedLoggedAt = pickMealScheduledTime(targetMealType, settings.mealPattern)
```

`targetMealType` is already collapsed to `'snacks'`, so an item logged to "Elevenses" for a past day
was stamped with the **snack slot's** time — even though the meal pattern holds `Elevenses 10:30`
exactly. The same shape as the rest of this review: the system knew, and discarded it at a boundary.
The timestamp is not cosmetic; it drives the timeline and the metabolic simulation.

**Fixed:** new `pickSlotScheduledTime` looks the slot up by its own name, falling back to the bucket
schedule when the pattern has no such slot.

## 5. One bad ingredient quantity turned a whole grocery row into NaN

`server/utils/services/nutritionPlanService.ts` (`getGroceryList`)

```ts
const quantity = Number(ingredient?.quantity || 0)
...
existing.quantity += quantity
```

`Number(x || 0)` guards null and undefined but not a non-numeric string, and `mealJson` is
AI-generated — `quantity: 'two'` is a value that really arrives. One NaN propagated through every
subsequent `+=` for that ingredient, so the aggregated row rendered as NaN.

**Fixed:** uses the existing `toFiniteNumber` helper.

## 6. Grocery list validated `start` but not `end`

`server/api/nutrition/grocery.get.ts` — `start` went through `parseDateOnlyUtc` and was rejected
when malformed; `end` was interpolated straight into a `Date` and reached the query as an Invalid
Date. **Fixed:** both validated, plus an ordering check.

## 7. Yazio stores the athlete's account password in plaintext — NOT FIXED

`server/api/integrations/yazio/connect.post.ts`

```ts
update: { accessToken: username, refreshToken: password, ... }
```

`Integration.accessToken` / `refreshToken` are plain `String` columns and nothing in `server/utils`
encrypts anything, so no integration secret is encrypted at rest. For the OAuth providers those are
revocable, scoped tokens. Yazio is different: it is a **reusable account password**, entered by the
athlete, stored verbatim, and people reuse passwords across services.

Deliberately left unfixed — encryption at rest is a key-management decision that belongs with the
whole `Integration` table, not a change to slip into a nutrition review. Worth its own issue.

## 8. Photo estimation had no payload bound and no dietary context

`server/api/nutrition/estimate-photo.post.ts` — `imageBase64: z.string()` was unbounded and
`mimeType` was any string, both forwarded to a paid vision model. The prompt also asked for a coach
insight "tailored for an endurance athlete" without telling the model about the athlete's
constraints.

**Fixed:** ~8 MB decoded cap, mime-type allowlist, and the constraints appended to the prompt —
read from settings rather than the request body, since they are the athlete's, not the caller's.

### Checked and clean

- `item.meal` carrying a custom slot name cannot reach `index.post.ts` — the Zod schema constrains
  it to `BREAKFAST | LUNCH | DINNER | SNACK | OTHER`, and every branch is handled.
- `/nutrition/history` reads persisted `Nutrition` rows only, so it never mixes assumed intake into
  what it presents as logged. It does not have the assumed/measured problem 378 found elsewhere.
- `DailyCheckinModal.vue` contains no nutrition or fueling logic at all.
- No nutrition or fueling email template exists; `app/emails/` is account, subscription and workout
  mail only. The "nutrition emails" item in the handoff has no subject.
- The new `DAILY_BASE:lunch#2` key shape from issue 379 is parsed correctly everywhere it is split:
  `mealRecommendationService` (`split('#')[0].split(':')[0]`), the mobile client's `baseWindowType`,
  and exact-key matching elsewhere.

### Noted, not fixed

- **No i18n in the nutrition modals.** `WindowBlock.vue`, `FoodAiModal.vue` and `FoodItemModal.vue`
  hardcode English throughout ("AI Nutrition Logger", "Coach Suggests", "Important", meal labels)
  while the rest of the app goes through Tolgee. A Hungarian athlete gets English here. Cosmetic but
  systematic; it is a translation pass, not a bug fix.
- **`FoodAiModal` defaults the target meal to `breakfast`** regardless of time of day when no
  `initialContext.mealType` is supplied.
