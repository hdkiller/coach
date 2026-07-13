# 253 — Nutrition Item Mutations: Non-Atomic Cross-Meal Move and Read-Modify-Write Races

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (logging)  
**Status:** Open

## Description

1. **Cross-meal move can delete the item.** In `PATCH /api/nutrition/[id]/items`
   (`action: 'update'`), when the item is found in a different meal the handler first
   persists the source meal **without** the item (`update(nutrition.id, { [m]: otherItems })`)
   and only later writes the target meal. If the second write fails (validation,
   connection, crash), the item is gone from both meals. The two writes should be one
   update call (both keys in a single `data` object).
2. **Lost updates under concurrency.** All item mutations (`items.patch`, `log.post`,
   `hydration-quick-add`) do read → spread array → write on JSON columns with no
   transaction/version guard. Two concurrent adds (e.g. double-tap on quick-add, AI log
   racing a manual add, Yazio sync racing a patch) read the same snapshot and the second
   write silently drops the first item. Totals are then recalculated from the truncated
   array, so the loss is persisted consistently and invisibly.
3. **Fuzzy fallback matching** (`name` + `|calories| < 1`) for update/delete can target
   the wrong duplicate item (two "Banana 105 kcal" entries).

## Affected Files

- `server/api/nutrition/[id]/items.patch.ts`
- `server/api/nutrition/[id]/log.post.ts`
- `server/api/nutrition/hydration-quick-add.post.ts`

## Acceptance Criteria

- Cross-meal move is a single atomic update.
- Item-array mutations run in a transaction with a re-read (or optimistic
  `updatedAt`/version check) so concurrent additions are not lost.
