# Liftosaur Integration Plan

## Status

- Scope: phases 1-5 (connection, workout import, provider wiring, settings, measurements)
- Out of scope: publishing Coach Watts planned workouts or programs to Liftosaur
- API documentation: <https://www.liftosaur.com/doc/api>

## Goals

1. Let a user connect a Liftosaur Premium account with a personal API key.
2. Import completed Liftosaur strength workouts into the canonical Coach Watts workout models.
3. Preserve the original Liftoscript Workout text so parsing can be audited and improved safely.
4. Import bodyweight and body-fat measurements when the user explicitly enables that setting.
5. Participate in manual sync, Sync All, sync guards, task monitoring, deduplication, and athlete-profile refreshes like existing integrations.

## API constraints

- Liftosaur uses a user-created `lftsk_` API key as a Bearer token.
- The API requires an active Liftosaur Premium subscription.
- Workout history is returned as Liftoscript Workout text rather than structured JSON.
- History and measurements are cursor-paginated with a maximum page size of 200.
- The public documentation does not describe webhooks or rate limits, so Coach Watts uses manual/batch polling, conservative pagination, bounded retries, and `Retry-After` when supplied.

## Data mapping

| Liftosaur                     | Coach Watts                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| API key                       | `Integration.accessToken`, provider `liftosaur`                        |
| History record ID             | `Workout.externalId`                                                   |
| History timestamp/program/day | `Workout.date`, title, description, and `rawJson`                      |
| Exercise and equipment name   | Deterministic provider exercise plus preserved equipment metadata      |
| Completed and warm-up sets    | `WorkoutSet` rows with set type, reps, weight, unit, duration, and RPE |
| Bodyweight measurement        | `Wellness.weight` in kilograms and body-measurement history            |
| Body-fat measurement          | `Wellness.bodyFat` and body-measurement history                        |

## Phase 1: provider foundation

- Add a typed Liftosaur client in `server/utils/liftosaur.ts`.
- Centralize authentication, timeouts, error parsing, retries, pagination, and response validation.
- Distinguish invalid keys (`401`), missing Premium access (`403`), parse errors (`422`), and retryable provider failures (`429`/`5xx`).
- Add `POST /api/integrations/liftosaur` to validate and store the API key.
- Add `DELETE /api/integrations/liftosaur/disconnect`.
- Add an authenticated `/connect-liftosaur` page.
- Never return or log the API key.

## Phase 2: Liftoscript Workout parser

- Parse workout metadata, duration, exercises, equipment, completed sets, warm-up sets, weights, units, durations, and RPE.
- Expand compact set notation such as `3x5 185lb` into individual set rows.
- Treat `target` clauses as prescribed metadata, not completed sets.
- Preserve unknown clauses and the complete source text in `Workout.rawJson`.
- Parse each record independently so one malformed record does not abort the complete sync.

## Phase 3: history ingestion

- Add `trigger/ingest-liftosaur.ts` on the user ingestion queue.
- Read `/history` using the requested date window and cursor pagination.
- Upsert on `(userId, source, externalId)` with source `liftosaur` and type `WeightTraining`.
- Replace exercise/set children transactionally when a remote record changes.
- Use a 90-day default window for an initial/manual import and support the existing custom-days UI path.
- Update integration sync status and return standard ingestion counts.

## Phase 4: provider wiring

Register `liftosaur` in:

- the integration sync API and task selection;
- provider sync guards;
- Sync All imports and dispatch;
- Trigger import smoke tests;
- task dependency metadata;
- settings provider lists, display names, ingestion defaults, and integration status consumers;
- public integration metadata where applicable.

## Phase 5: settings and measurements

- Add a connected-app card with connect, sync, settings, and disconnect actions.
- Add settings for completed workout import and body-measurement import.
- Default workout import to enabled and measurement import to disabled.
- When enabled, import `weight` and `bodyfat` measurement series for the selected date window.
- Merge measurement data through `wellnessRepository` and record canonical body-measurement history.
- Update the athlete profile weight only for a recent imported weight.

## Verification

- Unit tests for client errors, pagination helpers, parser fixtures, units, malformed records, and measurement normalization.
- Ingestion tests for idempotency and partial parser failures where practical.
- Trigger import smoke coverage for `ingest-liftosaur`.
- Route validation for missing/invalid keys, ownership, reconnect, and disconnect.
- UI/type verification for the connection page and connected-app settings.
- Run targeted Vitest suites, Nuxt typecheck, and ESLint on touched files.

## Known follow-ups

- The current `Integration.accessToken` storage path is shared with other API-key providers. Credential encryption at rest remains a broader platform concern.
- Liftoscript is an external DSL. Parser warnings and raw-source retention are required to make future syntax changes recoverable.
- Outbound program publishing is intentionally deferred because Liftosaur exposes whole-program CRUD and does not document an API operation for activating a newly created program.
