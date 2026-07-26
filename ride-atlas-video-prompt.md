# Prompt — Ride Atlas reel (Remotion, 9:16)

Paste everything below the line into a new session started in
`/Users/hdkiller/Develop/watts-marketing/watts-adz`.

---

Build a new 9:16 Remotion composition called **`RideAtlasReel`** in this project
(`watts-marketing/watts-adz`). It is a vertical product film about one real ride:
the phone sits centre-frame, the route draws itself across a map, the workout-detail
UI assembles around it as the ride progresses, and short caption lines float in to
narrate what the sensor data is actually saying.

## Read these first

**In this repo — follow their conventions, do not reinvent them:**

| File                                                    | Why                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/mobile/PhoneShell.tsx`                  | The iPhone shell. Reuse as-is. Note it renders `children` in a box inset by `STATUS_BAR_PT` / `TAB_BAR_PT`, so scene content must be an `AbsoluteFill` inside it.                                                                                                              |
| `src/components/mobile/ui.ts`                           | **Critical.** Everything inside the phone is authored in device points and converted with `pt()`. `DEVICE_WIDTH_PT = 402`. If you write raw pixels the UI renders at the wrong scale. Also exports the `UI` token set (`padX`, `card`, `border`, `hairline`, `sectionLabel`…). |
| `src/components/mobile/motion.ts`                       | `enterSpring`, `enter`, `fadeSlideUp`, `fadeSlideX`, `springSteps`/`scrollStops`, `pulse`, `glowPulse`. Use these; do not hand-roll springs.                                                                                                                                   |
| `src/components/mobile/LogMock.tsx` and `TodayMock.tsx` | The house pattern for a mocked screen — read one end to end before writing yours.                                                                                                                                                                                              |
| `src/compositions/MobileAppShowcase.tsx`                | The 9:16 template. Copy its safe-area constants (`SAFE_TOP = 150`, `SAFE_BOTTOM = 1490`, `SAFE_RIGHT = 200`), its `SafeAreaGuides` dev overlay, and its caption placement.                                                                                                     |
| `src/components/tour/shared.tsx`                        | `TourBackground`, `AudioBed`, `useTourGlow`.                                                                                                                                                                                                                                   |
| `src/brand.ts`                                          | `BRAND` tokens and `DEVICE_FONT_FAMILY`. Ad chrome uses `FONT_FAMILY` (Public Sans); anything **inside** the phone must use `DEVICE_FONT_FAMILY`.                                                                                                                              |
| `src/Root.tsx`                                          | Register the composition here.                                                                                                                                                                                                                                                 |
| `src/i18n/`                                             | Locale plumbing. See "Scope" below before wiring this up.                                                                                                                                                                                                                      |

**In the Coach Watts repos — the layout you are mocking:**

- `/Users/hdkiller/Develop/watts-mobile/app/(app)/activity/[id].tsx` — the real
  workout-detail screen. Section order: sport icon + title → date · type → hero
  stat tiles → status line → **Summary** metric grid (two columns, `w-1/2`) →
  plan adherence → **AI analysis** → route map → **Charts** → full analysis →
  Discuss with Coach button. Screen padding is `px-6` (24 pt). Mirror this order.
- `/Users/hdkiller/Develop/watts-mobile/src/features/activity/ActivityMap.tsx` —
  the map block: kicker `ROUTE MAP`, 200 pt tall, `rounded-xl`, hairline border.
- `/Users/hdkiller/Develop/watts-mobile/src/features/activity/ActivityCharts.tsx`
  and `charts/LineSeriesChart.tsx`, `charts/BarSeriesChart.tsx` — current chart
  styling (2 px stroke, round caps, end dot, legend row of dot + label).
- `/Users/hdkiller/Develop/watts-mobile/src/components/HeroStatTiles.tsx` — hero tiles.
- `/Users/hdkiller/Develop/watts-mobile/src/theme/colors.ts` — mobile colour tokens.

**Reference visual (open it in a browser):**
`/Users/hdkiller/Develop/coach-wattz/ride-atlas.html` — a desktop analysis page
built from this same ride. Steal its _ideas_ (gradient-coloured terrain strip,
climb ledger, the fade across climbs) and its gradient colour scale. Do **not**
copy its desktop layout or its density plots.

## The data

`/Users/hdkiller/Develop/coach-wattz/ride-atlas-data.json` (174 KB). Copy it to
`public/ride-atlas-data.json` and load with `staticFile()`, or import it directly —
your call, but it must be bundled, never fetched from the network.

Real production data from one ride. Shape:

- `workout` — title `"🇪🇸 Mallorca - M226"`, 222.5 km, 3,889 m, 7h12m, 185 W avg,
  209 W NP, 156 bpm, 546 TSS, 240 W FTP, 25,959 samples.
- `route[900]` — `{ x, y, km, t, alt, grade, w, hr, cad, kph, temp }`. **`x`/`y` are
  already projected into a 0..1 box with y flipped for screen space** — multiply by
  your draw rect and use directly. Resampled uniformly in _distance_, so stepping
  one index per frame moves at constant road speed.
- `profile[300]` — `{ km, alt, grade }` for the terrain strip.
- `climbs[10]` — each has `routeStart` / `routeEnd` (indices into `route`), plus
  `lengthKm`, `gain`, `avgGrade`, `maxGrade`, `cat`, `vam`, `avgW`, `avgHr`,
  `avgCad`, `avgTorque`, `avgTemp`, `topAlt`.
- `zones` — `{ hr: number[7], power: number[7] }`, seconds per zone.
- `story` — the pre-computed narrative numbers. **Use these; do not recompute or
  invent.** Key ones: `cadenceDropPct -10.6`, `torqueDropPct -1.6`,
  `powerDropPct -12.6`, `vamDropPct -11.2`, `hrDeltaBpm -8`, `tempRiseC 11`,
  `firstCadence 86` → `lastCadence 77`, `climbGainTotal 2207`, `lastClimbEndKm 146.8`.

Every number on screen must come from this file. This is a real athlete's ride —
no fabricated metrics.

## The story to tell

The ride is 222 km with ten climbs, all inside the first 147 km. Over those ten
climbs the rider's **power fell 13% and VAM 11%, but torque held within 1.6%** —
26 Nm at the start, 25 Nm at the end. The entire loss went into cadence: 86 → 77 rpm.
Same shove on the pedals, fewer of them. Heart rate fell 8 bpm _with_ the power
rather than drifting up against it, so this reads as deliberate pacing rather than
blowing up — while the air went from 10 °C at dawn on the high cols to 21 °C by the
last climb.

That is the payoff line: **"Your legs didn't get weaker. They changed gear."**

## Scenes (target ~35 s, 30 fps, 1080 × 1920)

Tune the exact frame counts yourself; this is the beat sheet.

1. **Hook (~0–3 s).** Phone enters. Title, date, hero tiles (222.5 km · 3,889 m ·
   7h12m). Caption: _"One ride. 25,959 sensor samples."_
2. **The route draws (~3–13 s).** Map block fills the phone. Route path animates on
   from `route[0]` to `route[899]` — stroke each segment coloured by that point's
   `grade` using the diverging scale below. A rider dot leads the draw. A small live
   readout (km / elevation / power / HR) tracks the dot. As the dot passes each
   climb's `routeStart`, a numbered pin drops. Caption around 6 s:
   _"Ten climbs. 2,207 m of the 3,889."_
3. **Terrain strip assembles (~13–19 s).** The map shrinks up; the gradient-coloured
   elevation profile slides in beneath it, drawn left to right from `profile`, with
   climb brackets numbered above. Caption: _"Colour is gradient — cool descends, warm climbs."_
4. **Climb ledger (~19–26 s).** Profile shrinks; a compact climb list scrolls up
   inside the phone (use `springSteps`/`scrollStops` for the scroll). Rows: `Climb n`,
   length, gain, avg %, VAM, W, rpm. Highlight climb 1 and climb 10. Caption:
   _"Same climbs. Watch the last column."_
5. **The reveal (~26–32 s).** The phone pushes back and dims; two big paired figures
   rise over it — **torque 25.8 → 25.4 Nm (−1.6%)** beside **cadence 86 → 77 rpm
   (−10.6%)**. Then the payoff line: _"Your legs didn't get weaker. They changed gear."_
6. **Outro (~32–35 s).** `BrandMark`, product line, CTA. Match `MobileAppShowcase`'s outro.

## Rules

- **Gradient colour scale** — diverging, blue ↔ red, neutral grey at flat. Bin
  breaks `[-10, -6, -3, -1.2, 1.2, 3, 6, 10]`, nine bins. Dark-mode stops:
  `['#86b6ef','#5598e7','#3987e5','#2f6ea8','#55554f','#a85b58','#e34948','#ea6b6a','#f39d9c']`.
  These are validated for colour-blind separation — do not substitute a rainbow or
  a green-to-red ramp.
- **Never put two units on one y-axis.** If power and HR both appear, they get
  separate stacked strips with their own scales. (The real app currently gets this
  wrong; the video should show the right thing.)
- Captions live between `SAFE_TOP` and `SAFE_BOTTOM`, clear of `SAFE_RIGHT`.
  Ad chrome in `FONT_FAMILY`, in-phone text in `DEVICE_FONT_FAMILY`.
- Phone position and scale stay fixed once it has entered — only the glow reacts to
  anything. A phone that moves on the beat reads as unstable (see the comment in
  `PhoneShell.tsx`).
- One caption on screen at a time. Let each breathe ~2.5 s.
- Everything inside the phone in `pt()`. Everything must survive being watched
  muted — no information carried by audio alone.

## Scope

- Register in `src/Root.tsx` at 1080 × 1920, 30 fps, alongside the standalone ads.
- Add a `render:atlas` script to `package.json` mirroring the existing render scripts.
- Reuse `TourBackground` and `AudioBed` from `components/tour/shared.tsx`.
- **English only for now** — do not wire this into `LOCALES` / the variant registry
  yet. Get one cut looking right first; ask me before generalising it into a
  `MobileTourProps`-style variant.
- Run `pnpm lint` (it runs `eslint src && tsc`) before you call it done, and render
  a still or two with `remotion still` to check the layout against `SafeAreaGuides`.

Start by reading the reference files and `ride-atlas-data.json`, then show me the
scene breakdown with frame ranges before you write the composition.
