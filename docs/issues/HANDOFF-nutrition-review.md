# Handoff — Nutrition system review

Continuation notes for a fresh session. Written at the end of a long review of the nutrition /
fueling / glycogen system across `coach-wattz` and `watts-mobile`.

## State right now

|                 |                                                                   |
| --------------- | ----------------------------------------------------------------- |
| `coach-wattz`   | **uncommitted** working tree; 1036 unit tests, 15 e2e, lint clean |
| `watts-mobile`  | **uncommitted**; 567 tests, typecheck + lint clean                |
| Issues captured | `docs/issues/378-*` (fixed), `docs/issues/379-*` (open)           |

The tree also contains **other agents' work** — `task-dispatcher`, `task-registry`, `queue.ts`,
`stripe/webhook`, e2e docs, `cli/worker/start.ts`. Separate those before committing.

## Do these first

1. ~~**Commit `watts-mobile`.**~~ **Done** — `mapNutritionPlan.ts` and its test are committed in
   `9018418`, and the assumed-intake client work in `760a5e1`. The uncommitted work now sitting in
   that tree is a _different_ feature (barcode scanning, food search, portion calculator) and is
   not the client half of the breaking change.

2. **Decide the deploy sequence.** Still open, but only for builds already in the wild. Ship mobile
   first / ship together / add a server compat shim (emit the bare type alongside the keyed one for
   one release). The shim is not written.

3. **At deploy:** `pnpm cli nutrition seed-catalog` (adds the missing INTRA templates), then hit
   **Generate Draft** on the current week — the weekly tab renders a `summaryJson` snapshot and
   keeps showing old windows until regenerated.

## The measurement tool

```bash
pnpm cli nutrition replay-model --prod --days 28 --users 25
```

Read-only (verified: `repairMetabolicChain`, the only writer, is unreachable from `getWaveRange`).
Emails are hashed so output is safe to paste. Read it as:

- clipping >10% → drain too aggressive; near 0% → over-corrected
- handoff error on **logged** days >5 pts → real chain discontinuity
- it separates genuine breakage from the deliberate no-data floor, so the number means what it says

Current production baseline: 0.1% / 1.1% clipping, 0 pts handoff, minimum distribution centred
50-59%.

## Open work, in priority order

1. ~~**`docs/issues/379`**~~ — **Fixed.** Relational validation
   (`server/utils/nutrition/settings-validation.ts`) on the effective merged settings, plus
   collision-proof `assignSlotWindowKeys` and a single shared `slugifySlot`. A read-only prod audit
   found 2 of 146 users already carrying duplicate slot names, and none whose fuel-state values the
   new rules reject. Harness baseline unchanged (0.1% / 1.1%, 0.0 pts).

   Follow-up **`docs/issues/380`** — the remaining unreviewed surfaces. Eight findings, seven
   fixed. The one left open is the Yazio integration storing the athlete's **account password in
   plaintext**; that needs an encryption-at-rest decision for the whole `Integration` table and
   deserves its own issue.

2. **Logging adoption.** 1% of production days carry logged food. The tank is now an honest
   projection of the plan rather than a misleading claim, but making it _measured_ is product work
   (photo capture, integrations, quick-add friction). Highest leverage remaining.
3. **Constants are reasoned, not fitted** — sport-drain weights (0.7 / 0.4), `GLYCOGEN_G_PER_KG_LEAN_MASS`
   (9), the drain anchors. All named at the top of `metabolic-simulation.ts` and `day-plan.ts`.
   The harness is how to settle them; change one at a time.
4. **Mobile now-marker** is hardcoded at `0.25` of the span assuming a "yesterday → +3 days" window
   (`EnergyHorizonChart.tsx`). Correct today, silently wrong if the range changes.

## Not reviewed at all

~~`/nutrition/history`, `connect-yazio`, photo capture, `WindowBlock.vue`, the grocery list,
nutrition emails, `DailyCheckinModal`, `ai-tools/nutrition.ts`.~~ All reviewed — see
`docs/issues/380`. Two of those turned out to have no subject: `DailyCheckinModal` holds no
nutrition logic, and there is no nutrition email template.

What is still unreviewed: the rest of `ai-tools/nutrition.ts` beyond `log_nutrition_meal` and the
tools already covered (it is 1274 lines and roughly half has now been read), and the Yazio _sync_
path in `server/utils/yazio.ts` (630 lines) — only the connect endpoint was looked at.

## Things worth knowing

- **I never ran the app visually.** Everything is unit/e2e tested and driven through the harness.
  The chart dash patterns and whether "assumed" reads clearly against "projected" are visual
  judgements I could not make. Worth five minutes with the app.
- **Suggest meal has no e2e coverage** — it goes through Trigger.dev, which isn't running in e2e.
- **Two trigger tasks aren't e2e-testable** for the same reason; `adjust-fueling-post-workout` has
  unit tests, `nutrition-last-call` has none (it's disabled anyway).
- **Mutation-test new tests.** Three of mine passed against deliberately broken code before I
  caught them. Revert the fix, confirm the test fails, restore.
- The e2e dev server OOMs after a few hundred HMR reloads — raise `--max-old-space-size` in
  `e2e/scripts/run-app-host.ts` if it dies mid-run.

## The pattern behind most of it

Nearly every defect was the same shape: **the system knew something and discarded it at a
boundary.** A window knew which sessions it served; the key didn't carry it. The model knew intake
was inferred; the API didn't say so; the chart guessed from a display string; the tooltip asserted
the opposite. When looking for more, follow the information rather than the code.
