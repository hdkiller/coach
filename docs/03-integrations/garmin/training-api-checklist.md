# Garmin Training API Checklist

Internal checklist for publishing planned workouts to Garmin Connect via the **Training API V2**. Partner OpenAPI lives in `tmp/garmin-api/training-api-workouts.json`; V2 behavior also comes from the Garmin Training API V2 partner PDF (not checked into git).

## Scope

| Direction                  | API                    | Permission                            |
| -------------------------- | ---------------------- | ------------------------------------- |
| Push structured workouts   | Training API V2        | `WORKOUT_IMPORT` (or `PARTNER_WRITE`) |
| Push routes                | Courses API            | `COURSE_IMPORT` (or `PARTNER_WRITE`)  |
| Pull wellness / activities | Health + Activity APIs | Separate export scopes                |

Athlete-facing docs (`content/documentation/.../garmin.md`) cover ingest only. This file covers **publish**.

## Endpoints we use

| Action                   | URL                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Create                   | `POST https://apis.garmin.com/training-api/workout/v2` (fallback: `…/workoutportal/workout/v2`) |
| Get / Update / Delete    | `…/training-api/workout/v2/{workoutId}`                                                         |
| Schedule create / update | `…/training-api/schedule` and `…/schedule/{scheduleId}`                                         |

**Note:** Older OpenAPI only documents V1 create (`POST …/workout` with top-level `steps`). V2 create with `segments` works live and matches the V2 PDF.

## Payload rules (must stay true)

- [ ] **V2 shape:** top-level `sport` + `segments[]` (one segment for single-sport run/ride). Do **not** send top-level `steps` on V2 create/update.
- [ ] **Repeats:** nest as `WorkoutRepeatStep` + `REPEAT_UNTIL_STEPS_CMPLT` + child `steps` (do not unroll by default).
- [ ] **`stepOrder`:** assign globally (parent repeat before children), matching V2 examples.
- [ ] **100-step leaf limit** for single-sport workouts (`countGarminWorkoutSteps`).
- [ ] **`ownerId`:** Java `Long` (numeric Connect user id) only. Never send the wellness `/user/id` UUID.
- [ ] **Create:** omit `workoutId` (server assigns). `ownerId` optional if numeric.
- [ ] **Update:** body `workoutId` must equal path `workoutId` (null → Garmin error `doesn't match with null`).
- [ ] **`workoutProvider`:** `COACH_WATTZ` (≤ 20 chars).
- [ ] **`workoutSourceId`:** unique per planned workout — hyphen-stripped planned id, truncated to 20 chars (`toGarminWorkoutSourceId`). Fallback `COACH_WATTZ` only when no id.
- [ ] **`isSessionTransitionEnabled`:** `false` for single-sport.
- [ ] **Schedule create response:** may be a bare integer (`scheduleId`); use `extractGarminScheduleId`.

## Target mapping (run / ride)

| Sport                      | Primary preference                  | Secondary                                                    |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `RUNNING` (incl. TrailRun) | `PACE` (m/s) → HR → power → cadence | **Omit** (V2 docs only guarantee secondary for cycling/swim) |
| `CYCLING`                  | `POWER` → HR → cadence → pace       | Allowed (e.g. cadence as `secondaryTargetValueLow`/`High`)   |
| `LAP_SWIMMING`             | Pace → HR → …                       | Allowed                                                      |

- [ ] Relative power/HR converted with athlete FTP / LTHR (or defaults) before send.
- [ ] Distance steps use `durationType: DISTANCE` + `durationValueType: METER`.
- [ ] Cadence secondary: prefer **low/high range**, not scalar `secondaryTargetValue` (Garmin often drops the scalar).

## Permission / identity checks before publish

- [ ] Integration exists; token refreshed via `ensureValidToken` / `refreshGarminToken`.
- [ ] Scope includes `WORKOUT_IMPORT` (merge live `GET …/wellness-api/rest/user/permissions` if DB scope is stale).
- [ ] Persist Garmin `workoutId` + `scheduleId` on `PlannedWorkoutPublishTarget` (`garmin_training`).

## Verification (prefer device over Connect web)

Connect web (`gc-api/workout-service`) and Partner Training API use **different ID spaces**. Training API workouts may not appear like native library workouts in the browser; deep links can 404.

1. Publish from Coach Watts → expect `SYNCED` publish target with numeric `externalId`.
2. Confirm structure via Training API GET (CLI: `pnpm cw:cli debug garmin-training-inspect <email> --prod --workout-id <id>`).
3. Sync calendar to a physical Garmin device and confirm step targets / repeats there.

## Known non-goals / gaps

- Webhook signature verification for Health/Activity push still postponed (issue 069) — ingest compliance, not Training payload.
- Multisport (`isSessionTransitionEnabled`, multi-segment) not implemented.
- Courses publish is a separate destination (`COURSE_IMPORT` + geo points).

## Code map

| Concern                | Location                                                  |
| ---------------------- | --------------------------------------------------------- |
| Payload builder        | `server/utils/garmin-push.ts`                             |
| Canonical → Garmin     | `server/utils/canonical-workout-serializer.ts`            |
| HTTP publish           | `server/api/workouts/planned/[id]/publish-garmin.post.ts` |
| Support matrix         | `shared/workout-support-matrix.ts`                        |
| Unit tests             | `tests/unit/server/utils/garmin-push.test.ts`             |
| Local OpenAPI snapshot | `tmp/garmin-api/training-api-workouts.json`               |
