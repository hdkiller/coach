# Prompt — Activity detail: chart fixes + terrain & climbs

Paste everything below the rule into a new session started in
`/Users/hdkiller/Develop/watts-mobile`.

---

Work on the **activity detail screen** in this repo (`watts-mobile`). There are two
parts: fix three real defects in the existing charts, then add the one piece of
analysis that belongs on a phone — a gradient-coloured terrain strip and a climb
ledger. Everything needed is already in the API response; **no server change is
required and none is in scope for this task.**

Do part A first and let me look at it before starting part B.

## Orientation — read these first

| File                                                   | What it is                                                                                                                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/activity/[id].tsx`                          | The screen (434 lines). Section order: title → date · type → `HeroStatTiles` → status → Summary metric grid → plan adherence → `AnalysisGlance` → `ActivityMap` → `ActivityCharts` → full analysis → description → buttons. |
| `src/features/activity/ActivityCharts.tsx`             | Chart section wrapper.                                                                                                                                                                                                      |
| `src/features/activity/charts/LineSeriesChart.tsx`     | The stream chart. **Where defects 1 and 2 live.**                                                                                                                                                                           |
| `src/features/activity/charts/BarSeriesChart.tsx`      | Zone bars + power curve.                                                                                                                                                                                                    |
| `src/features/activity/mapCharts.ts`                   | Stream → chart mapping. **Where defect 3 lives.** Currently keeps only `watts`, `heartrate`, `latlng` and zone times.                                                                                                       |
| `src/features/activity/chartTypes.ts`                  | `WorkoutStreamsApi` type — deliberately a subset. You will widen it.                                                                                                                                                        |
| `src/features/activity/useActivity.ts`                 | `useActivityStreamsQuery(id)` etc.                                                                                                                                                                                          |
| `src/theme/colors.ts`, `src/theme/nutritionAccents.ts` | Colour tokens. `nutritionAccents.ts` is the precedent for a **named domain colour set living in `src/theme/`** — follow it.                                                                                                 |
| `docs/DESIGN.md`                                       | House design system (Hallmark). Files carry a `/* Hallmark · genre: … */` header — keep it on files you create.                                                                                                             |

Conventions that will bite you if you miss them:

- `pnpm lint` runs `expo lint` **and** `scripts/check-theme-tokens.mjs`, which fails
  the build on raw neutral hex (`#09090b`, `#27272a`, `#18181b`, `#3f3f46`) or
  `zinc-*` classes outside `src/theme/`. Put any new palette in `src/theme/`.
- `pnpm test` is vitest with `include: ['src/**/*.test.ts']` — **`.ts` only, not
  `.tsx`**. So all logic you want tested must live in plain `.ts` modules, with
  components as thin renderers. Existing tests sit in
  `src/features/activity/__tests__/`.
- `pnpm typecheck` is `tsc --noEmit`. Run all three before calling anything done.

## Part A — fix the stream chart

Three defects, all measured against a real 222 km ride (25,959 samples, power
0–756 W, HR 103–182 bpm):

**A1. Power and heart rate share one y-axis.** `LineSeriesChart.tsx:53-59` takes
min/max across _all_ series, so both units land on one scale and **heart rate gets
9.8% of the chart height** — 12 px of 126. The cardiac story is a flat line.

Fix: render **one panel per unit, stacked, each with its own y-scale**, sharing the
x-axis. Do not add a second y-axis to one plot — two scales on one plot invent a
correlation that isn't in the data. Two small stacked charts is the correct shape.
Keep the existing 2 px stroke, round caps, end dot and legend row.

**A2. There are no y-axis labels at all.** `yTicks` is computed on line 71 and used
only to draw gridlines — no `<Text>` is ever rendered. Add value labels (min / mid /
max per panel) in the muted text token. Round to clean numbers.

**A3. Peak power is understated by 29%.** Decimation happens twice, both
nearest-index with no averaging: the server thins 25,959 → 2,000, then
`downsamplePoints` in `mapCharts.ts` thins 2,000 → 200. True max 756 W → 609 W →
**534 W**. One displayed point covers 130 seconds; every surge is invisible.

Fix: replace nearest-index picking with a **per-bucket min/max/mean envelope**. For
each output column compute min, max and mean over the samples that fall in it, then
draw the min–max band as a ~10% opacity wash with a 2 px mean line on top. Peaks
stop disappearing and the chart stops lying about the maximum. Keep the output
column count tied to rendered width rather than a hard-coded 200.

Extract the bucketing into a pure function in `mapCharts.ts` (or a new
`streamEnvelope.ts`) and unit-test it: a known spike must survive bucketing, and
bucket count must never exceed input length.

## Part B — terrain strip + climb ledger

### The data is already there

`GET /api/workouts/:id/streams` already returns `altitude`, `distance`, `cadence`,
`velocity`, `grade`, `temp`, `torque`, `lrBalance`, `lapSplits`, `surges`,
`pacingStrategy`, `detectedIntervals` and `detectedClimbs` — downsampled to 2,000
points. `mapCharts.ts` throws all of it away. Widen `WorkoutStreamsApi` in
`chartTypes.ts` and start using `altitude`, `distance`, `cadence` and `temp`.

### Ignore the server's `detectedClimbs` — it is broken

Do **not** consume `detectedClimbs` from the response. Two reasons, both verified:

1. **Its indices are out of bounds.** The server runs detection on the
   full-resolution arrays but ships the streams downsampled to 2,000. On the
   reference ride all 41 returned climbs have `end_index ≥ 2000`, and
   `altitude[climb.start_index]` reads 164.8 m where the climb actually starts at
   80.2 m — wrong silently, no error.
2. **It over-segments.** Its algorithm opens a climb on any ascending sample and
   closes it on any descending one, so it returns **41 climbs** on a ride with ten
   (median 1.2 km, shortest 187 m). Unusable as a list.

Both are being fixed server-side separately. Until then, derive climbs on-device.

### Derive climbs locally — this is verified to work

Write a pure module `src/features/activity/climbs.ts` implementing **drawdown
segmentation**:

- Smooth altitude over a **120 m distance window** (not a sample-count window — the
  sampling rate varies with speed).
- Walk the smoothed profile tracking a running min and running max. When altitude
  falls more than **25 m** below the running max, close a climb from min-index to
  max-index and reset. Reset the min while the rise so far is still under 25 m.
- Keep a segment only if **gain ≥ 100 m, length ≥ 1 km, average grade ≥ 3%,
  duration > 120 s**.
- For each kept climb compute: start km, length, gain, avg grade, max grade, VAM
  (`gain / hours`), duration, and average power / HR / cadence over its index range.
- Category from `length_m × grade_%`: ≥80000 HC, ≥64000 Cat 1, ≥32000 Cat 2,
  ≥16000 Cat 3, ≥8000 Cat 4, else uncategorised.

I verified this against the 2,000-point payload the API actually ships. It recovers
**all ten** real climbs, and versus running the same algorithm on the full 25,959
samples the error is: gain within 2 m, average grade within 0.1%, VAM within ~1%,
average power within 4 W, cadence within 1.7 rpm. The downsample is not a problem
for this feature — do not add a "fetch full resolution" path.

Keep this module free of React and React Native imports so it tests as `.ts`. Unit
test: ten climbs from a synthetic profile, no climbs from a flat profile, and that
the 25 m drawdown correctly merges a small dip rather than splitting one climb in two.

### Gradient colour scale

Add `src/theme/gradientScale.ts` (a named domain palette, same shape as
`nutritionAccents.ts`). Diverging blue ↔ red with a neutral grey midpoint — descent
reads cool, climbing reads warm, flat is quiet. Nine bins, breaks at
`[-10, -6, -3, -1.2, 1.2, 3, 6, 10]`:

```
['#86b6ef','#5598e7','#3987e5','#2f6ea8','#55554f','#a85b58','#e34948','#ea6b6a','#f39d9c']
```

These are validated for colour-blind separation and for contrast on the dark
surface. Do not substitute a rainbow or a green→red ramp. Provide a light-mode set
too and select via `useThemeColors` — on light, the extremes darken instead of
brightening.

### UI

Add two blocks to `app/(app)/activity/[id].tsx`, **between `ActivityMap` and
`ActivityCharts`**, both rendering nothing when the ride has no usable altitude:

**Terrain strip.** Kicker `TERRAIN`, matching `ActivityMap`'s block styling
(`rounded-xl`, hairline border, ~160 pt tall). One filled column per horizontal
pixel, coloured by that column's mean gradient. Numbered climb brackets above.
X-axis is distance in km. Baseline is the local minimum, not sea level — zero-basing
squashes a mountain profile flat. Below it, a compact gradient legend.

**Climb ledger.** Kicker `CLIMBS`, a list of rows: `Climb n`, length, gain,
avg %, category chip, time, VAM, avg power, avg rpm. Tapping a row expands it, or
scrolls/highlights the matching bracket in the terrain strip — your call, but a tap
target must be at least 44 pt. Keep the whole block under about one screen; if there
are more than eight climbs, show the biggest six by gain plus a count.

Do **not** add: a torque × cadence density plot, a left/right balance chart, an
efficiency-drift line, or a multi-metric selector. Those are desktop analysis and
are explicitly out of scope here.

## Product framing

`docs/product-baseline.md` and the Coach Watts spec
(`/Users/hdkiller/Develop/coach-wattz/docs/06-plans/mobile-companion-app.md:203`)
describe this screen as a **"lightweight completed-session view"**, with analytics
builder and performance explorer as explicit non-goals. Respect that.

Part A is a bug fix and needs no justification. Part B is a deliberate, bounded
addition — the climb ledger is the one piece of ride analysis that is _more_ useful
on a phone than at a desk, and it costs one API field set that is already being
delivered. If it starts growing a metric picker or a second chart type, stop and ask.

## Reference

`/Users/hdkiller/Develop/coach-wattz/ride-atlas.html` — open in a browser. A desktop
analysis page built from the same ride. Take the terrain strip, the gradient scale
and the climb ledger from it. Ignore its layout, its density plots and its
eight-metric selector; those are the parts that do not belong on a phone.

## Definition of done

- `pnpm lint`, `pnpm typecheck`, `pnpm test` all clean.
- New logic covered by `.ts` unit tests in `src/features/activity/__tests__/`.
- Screen renders correctly for: a ride with full streams, a ride with no altitude
  (indoor trainer), a ride with no power, and a strength session with no streams at
  all — no empty blocks, no crashes.
- Verified in the simulator on a real workout, light and dark.

Start by reading the files above and confirming the three defects yourself, then
show me your plan for Part A before writing code.
