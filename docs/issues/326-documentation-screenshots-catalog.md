# 326 — Documentation screenshots catalog

**Priority:** Medium  
**Type:** Documentation  
**Status:** Fixed (partial — export modal deferred)  
**Area:** `public/media/docs`, `content/documentation`

## Purpose

Enrich foundation/support docs (324–325) with cropped product UI screenshots (main dashboard panel only — no app sidebar).

## Capture tooling

`node scripts/capture-doc-screenshots.mjs` (requires running `pnpm dev` + `AUTH_BYPASS_USER`).

Crops `#dashboard-panel-{id}` at 1440×900 dark mode → `.webp` in `public/media/docs/`.

## Catalog

| #   | Filename                          | Status   | Used in                                                                             |
| --- | --------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| 1   | `athlete-dashboard-overview.webp` | Done     | Athlete User Guide                                                                  |
| 2   | `settings-billing.webp`           | Done     | Account & Billing                                                                   |
| 3   | `library-exercises.webp`          | Done     | Strength Training                                                                   |
| 4   | `library-gym-workout.webp`        | Done     | Strength (athlete + coach)                                                          |
| 5   | `library-workouts.webp`           | Done     | Structured Workouts                                                                 |
| 6   | `activities-calendar.webp`        | Done     | User Guide + Structured Workouts                                                    |
| 7   | `performance-load-chart.webp`     | Done     | Performance                                                                         |
| 8   | `library-plans.webp`              | Done     | Applying & Updating Plans                                                           |
| 9   | `coaching-overview.webp`          | Done     | Coach Account Guide                                                                 |
| 10  | `coaching-calendar.webp`          | Done     | Coach Guide + Applying Plans + Strength coaches                                     |
| 11  | `coaching-athletes.webp`          | Done     | Coach Guide + Working with a Coach                                                  |
| 12  | `planned-workout-export.webp`     | Deferred | No planned workouts in capture account — revisit when calendar has planned sessions |
| 13  | `ai-chat.webp`                    | Done     | AI Chat + Athlete User Guide                                                        |
| 14  | `settings-sport-profiles.webp`    | Done     | Sport Profiles, Thresholds & Zones                                                  |
| 15  | `settings-connected-apps.webp`    | Done     | Connected Apps & Sync Settings                                                      |

## Already had (reused)

- `training-plan-overview.jpg`
- `fitness-trends.jpg`
- `daily-training-card.jpg`
- `nutrition-profile.jpg`

## Acceptance

- [x] Screenshots captured from authenticated session
- [x] Files under `public/media/docs/` as `.webp` (panel crops, no sidebar)
- [x] New docs embed images with descriptive alt text
- [ ] Planned workout Download (ZWO/FIT) modal — deferred until account has planned sessions
