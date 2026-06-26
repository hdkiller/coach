# Support Ticket Bug Tracker - 2026-06-16

Last updated: 2026-06-26 (third pass)

## Purpose

This document is the working tracker for support-ticket bug handling.

It is meant to answer four questions at a glance:

- which ticket clusters are active engineering work
- which issues have already been addressed in code
- which bug tickets still need investigation or patching
- which tickets should be excluded from the engineering bug backlog because they are feature requests or operational tasks

Related documents:

- [support-ticket-triage-2026-06-16.md](./support-ticket-triage-2026-06-16.md)
- [support-ticket-investigation-2026-06-16.md](./support-ticket-investigation-2026-06-16.md)
- [support-feature-request-tracker-2026-06-25.md](./support-feature-request-tracker-2026-06-25.md)
- [support-ticket-handoff-2026-06-25.md](./support-ticket-handoff-2026-06-25.md)

## Working Rules

- this tracker focuses on bugs, defects, regressions, sync failures, and operational incidents that require engineering validation
- feature requests are listed separately and are not part of the active bug backlog
- account operations and other support-only tasks are listed separately and are not part of the active bug backlog
- duplicate user reports should be grouped under a canonical incident whenever possible
- a ticket can be `addressed in code` while still remaining `pending verification`

## Review Coverage

Current review basis:

- the original 50-ticket triage completed on 2026-06-16
- an expanded review of the 100 most recent tickets in production on 2026-06-18
- a production spot-check of eight non-chat sync tickets on 2026-06-25

Key takeaway from the larger sample:

- the bug backlog is still dominated by sync and ingestion reliability issues
- there is a second meaningful cluster around workout structure generation and rendering
- several newer tickets are clearly feature requests or admin tasks and should not compete with bug-fix work

## Status Legend

- `addressed in code`: patch applied locally, pending runtime verification and ticket cleanup
- `in progress`: actively being investigated or grouped as a live engineering workstream
- `queued`: valid bug cluster, not yet actively patched in this pass
- `excluded`: not part of the engineering bug backlog for this tracker

## Addressed In Code

### 1. Intervals Sync Reliability Hardening

Status:

- addressed in code
- pending runtime verification

Canonical incidents:

- `05c440b8-416c-4352-b750-1eb77061a90a` Ralf sync master
- `4076711c-d3e5-40fa-823b-f5b6f02081e8` Dzmitry sync master candidate

Applied fixes:

- queued Intervals planned-workout sync payloads now hydrate serialized dates before retry processing
- Intervals publish/update helpers now coerce `Date | string` and fail clearly on invalid values
- sparse Intervals webhook activity handling now attempts a detailed fetch before skipping
- sparse webhook fallback now logs whether detailed fetch recovered the activity or still left it too sparse

Still needed:

- update targeted regression mocks now that the test/runtime environment is working again
- add regression coverage for queued date hydration and sparse webhook fallback
- confirm whether source-specific tickets still reproduce after these fixes

Related tickets likely affected:

- `221c609f-ae1c-4020-b4cc-d61d059d39e9`
- `fd7c42ec-19f1-4a15-bde9-4ffd223af28d`
- `8f567102-c948-4039-8e73-5fe60f9f9047`
- `85182d74-4ba2-469b-bd89-1f56857f6a51`
- `d46cdb78-c9d3-427d-9bb1-289debbaca35`
- `8d59d539-0021-4530-8dc8-e13161d752c0`
- `0686046e-ac48-4411-b7fe-0783ee13e410`
- `e4812fc8-7053-4fc4-ac2b-92aa39d69479`

2026-06-25 spot-check, with 2026-06-26 follow-up:

| Ticket                                 | Current production state                                                                                                                                                                                                                | Backlog disposition                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `221c609f-ae1c-4020-b4cc-d61d059d39e9` | The reported 2026-06-11 workout now exists in the app as an Intervals workout. This ticket is about planned-workout export to Intervals rather than missing completed activity ingestion.                                               | Exclude from the current sweep because it touches workout-generation and publishing triggers, which are paused for now.                                        |
| `fd7c42ec-19f1-4a15-bde9-4ffd223af28d` | No Intervals workout exists on 2026-06-06, but a Strava ride for that date exists in the app and newer Intervals workouts continue through 2026-06-22.                                                                                  | Closed on 2026-06-26 after adding internal findings and a public stale/source-specific response.                                                               |
| `8f567102-c948-4039-8e73-5fe60f9f9047` | The reported 2026-05-26 and 2026-05-28 workouts now exist in the app.                                                                                                                                                                   | Closed on 2026-06-25 after adding internal findings and a public duplicate/stale response.                                                                     |
| `85182d74-4ba2-469b-bd89-1f56857f6a51` | Intervals ingestion had been disabled on the integration row. After re-enabling `ingestWorkouts` and running a historical activity import on 2026-06-26, Intervals workouts increased from 52 to 187 and now extend through 2026-06-24. | Resolved on 2026-06-26 after re-enabling ingestion and backfilling historical Intervals activities.                                                            |
| `d46cdb78-c9d3-427d-9bb1-289debbaca35` | The reported 2026-05-14 workout exists, and the user has many newer Intervals workouts through 2026-06-24.                                                                                                                              | Closed on 2026-06-25 after adding internal findings and a public duplicate/stale response.                                                                     |
| `8d59d539-0021-4530-8dc8-e13161d752c0` | The reported 2026-04-25 workout exists from Intervals, and the same day also has Strava and fit-file entries. The user currently has no active integration row.                                                                         | Closed on 2026-06-25 as historical/stale after adding internal findings and a public response.                                                                 |
| `0686046e-ac48-4411-b7fe-0783ee13e410` | Garmin integration is currently in `FAILED` state, but Garmin-source workouts are present through 2026-06-25. Existing ticket comments already point to reconnecting Garmin.                                                            | Closed on 2026-06-25 as an operational/support follow-up rather than an active core ingestion bug.                                                             |
| `e4812fc8-7053-4fc4-ac2b-92aa39d69479` | Activities are present throughout the reported 2026-03-24 to 2026-04-06 window, primarily via Strava, and newer workouts continue past the ticket date.                                                                                 | Closed on 2026-06-25 after adding internal findings and a public duplicate/stale response.                                                                     |
| `fec5b9ae-5a3b-46af-af24-507efdcb0abd` | The cited 2026-05-28 Strava run now exists in production as `1831b8bc` (Afternoon Run).                                                                                                                                                 | Closed on 2026-06-26 as stale after fresh production validation.                                                                                               |
| `65aa4f0a-9f0d-450d-ac81-83dcd14cea4c` | The cited 2026-05-31 workouts still exist in production, but the user reports they remain invisible in the app.                                                                                                                         | Root cause found 2026-06-26: calendar API fetch range ended before local May 31 afternoon for `America/Los_Angeles`; fix pending deploy in `calendar-data.ts`. |

Implementation note:

- the ticket system currently does not expose a `DUPLICATE` status through `cw:cli`; the available close states are `OPEN`, `IN_PROGRESS`, `NEED_MORE_INFO`, `RESOLVED`, and `CLOSED`
- for these stale duplicate-style cases, the ticket record now carries the duplicate rationale in an internal note and the ticket itself was closed with status `CLOSED`
- `pnpm cw:cli debug workout ... --prod` currently fails against production because of Prisma/schema drift, so direct `cw:cli db sql` checks were used for the 2026-06-26 validation pass

### 2. Workout Access Hardening

Status:

- addressed in code
- pending regression coverage

Canonical incident:

- `31cf00a6-f276-456b-aa74-b44b8b2d575e`

Applied fixes:

- workout explorer endpoints now use a shared scoped workout fetch helper
- self-only workout detail endpoints now use explicit owner-scoped reads
- self-only workout mutation endpoints now use explicit owner-scoped reads
- duplicate promotion rewiring is now limited to the same owner

Still needed:

- regression tests for same-title cross-user collisions
- regression tests for duplicate/canonical remap scenarios
- follow-up with support if timestamps or screenshots are available for the original report

## Active Bug Backlog

### 1. Sync Reliability And Ingestion

Status:

- in progress

Why this is still open:

- the code fixes above reduce two confirmed risk areas, but the broader ticket cluster likely contains both shared ingestion defects and source-specific bugs

Canonical or anchor tickets:

- `05c440b8-416c-4352-b750-1eb77061a90a`
- `4076711c-d3e5-40fa-823b-f5b6f02081e8`

Likely duplicate or adjacent tickets:

- `ba28a661-3f38-4db5-bb95-54adcb01807a`
- `8ce1eb5f-b665-463b-a75a-57b23057efd8`
- `343d3dc4-2230-4ed6-84ba-2b26f9bd6637`
- `f2925038-7525-4e73-8140-f314c7a95c44`
- `71d6b51a-9fa8-4af1-8823-2a07975df6ca`
- `698b9bf5-2a86-4c7a-944a-d88fbdd83e18`
- `3da03c07-2042-46f4-92fa-6ab11753e39f`
- `d94f8241-8439-45c8-8b94-03a518bf2259`
- `afe90d13-aad1-484b-bdd9-c06b84cb5744`
- `3087f54b-59ff-4f58-9945-97d194cfd3b0`
- `f56f33f6-e8fd-46b0-a587-8c1b75861354`
- `ddaed42a-c844-4cd5-b279-f2f376ed0c91`
- `65aa4f0a-9f0d-450d-ac81-83dcd14cea4c`
- `fec5b9ae-5a3b-46af-af24-507efdcb0abd`
- `ae78baec-9842-49b8-90e7-0db439c09fd6`
- `d87ba136-a9df-4fd0-8c72-292ff43af0bf`
- `54e133fd-537d-418f-9e5f-8bfc23bf1687`

Next steps:

- finish runtime verification now that targeted Vitest runs are working again
- decide on the Dzmitry master ticket and link related IDs with internal notes
- split source-specific incidents if Garmin, Hammerhead, Strava, cadence, or planned-workout publishing still fail independently
- deprioritize `221c609f-ae1c-4020-b4cc-d61d059d39e9` until workout-generation and publish-trigger work is back in scope
- continue closing or internally marking the stale-looking tickets once support confirms they no longer reproduce

### 2. Activity Tab And Workout Rendering

Status:

- in progress

Scope:

- activity page not loading
- workout detail/activity UI rendering failures
- mobile-specific display failures
- calendar fetch range dropping late-day completed workouts on the last visible grid day for western timezones (`65aa4f0a`, fixed locally in `calendar-data.ts`, pending deploy)

Anchor tickets:

- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34`
- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`

Current findings:

- the production data does not point to a total calendar API outage for the reported users
- several affected planned workouts contain a `structuredWorkout` object with descriptive guidance but no renderable `steps`
- the activities page was still attempting mini-chart previews for any truthy `structuredWorkout`, even when there was nothing previewable to draw
- `eeccc4ba-554c-4475-a457-72dfcbba8f73` was closed on 2026-06-26 as a same-day duplicate-style follow-up of `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34`
- `99e9b58a-ac01-44f2-bd61-11b22a3876fc` was closed on 2026-06-26 after fresh production validation showed recent activities present again for that user
- `fcc8048a-e902-4d8f-a99a-902c0cb08442` was closed on 2026-06-26 after fresh production validation showed recent activities present and no evidence of an ongoing data absence behind the older mobile-display report
- `2963ef72-0fe5-4439-8984-3fe2647f1034` was closed on 2026-06-26 after fresh production validation showed current workouts present again, making the older interval-display report look stale or source-shifted

Applied in code:

- activity-page mini workout charts now render only when the workout has previewable structure data
- chart-preference detection now traverses step trees more defensively
- workout chart empty states now show the structured workout description when interval steps are missing
- run workout detail views now show narrative workout guidance when no interval-step structure exists

Next steps:

- reproduce with affected users or representative data
- separate API/data failures from frontend rendering failures
- determine whether mobile rendering is a separate bug family

### 3. Structured Workout Generation, Persistence, And Display

Status:

- in progress

Why this moved up:

- the 100-ticket sample shows a broader structure-related pattern than the first 50 alone

Anchor tickets:

- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`
- `a232e0ab-245e-4e95-ac37-e03fa7db6e37`
- `10565730-46cd-4422-bef3-edf8b16d7df7`
- `094c9607-f15f-49ff-b713-11f66cfcde15`
- `5b04e4cb-04f7-4fdf-999f-a94f049b9340`

Current findings:

- Dzmitry's specific June 12, June 14, and June 20 examples now have real structured steps in production, so the exact records cited in `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` no longer reproduce as originally described
- Dzmitry still has other planned workouts where `structuredWorkout` exists but `step_count = 0`, so the broader persistence/rendering defect family remains active on that account
- Philippe's cited May 8 workout in `0eb3e1a5-101d-4746-91b3-0e9529195072` now has 6 steps and that ticket was closed on 2026-06-26
- Philippe's other anchor ticket, `a232e0ab-245e-4e95-ac37-e03fa7db6e37`, could not be revalidated on the exact original workout because that workout ID no longer exists, but the same account still has a large active zero-step pattern across multiple workout types
- current zero-step structured-workout counts on Philippe's account include WeightTraining: 53, Ride: 35, MountainBikeRide: 24, Run: 2
- Dzmitry's update/sync-specific ticket `d3512b30-86a2-493d-beff-ab6fdb66378d` was closed on 2026-06-26 because the exact original planned workout no longer exists and the remaining nearby zero-step issue is better tracked under `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`
- Billy Rusk's cited workout in `17ee0ba8-5355-46b0-a67a-875c6d015036` now has structure again and that ticket was closed on 2026-06-26
- Billy's broader active structure family is now anchored by `10565730-46cd-4422-bef3-edf8b16d7df7`, because nearby records in the same training block still show empty or missing structures and many future planned workouts on that account still have `has_structure = false`
- Benoit Naturel's ticket `094c9607-f15f-49ff-b713-11f66cfcde15` was moved to `IN_PROGRESS` on 2026-06-26 because the account still shows many recent planned workouts with missing structure data, including repeated `has_structure = false` and `step_count = 0` cases from 2026-06-12 onward
- Joe's cited workout in `5b04e4cb-04f7-4fdf-999f-a94f049b9340` now has structure again (`has_structure = true`, `step_count = 1`), but the same account still shows a broad active pattern of missing structure across many later records from early May through late June, so that ticket was also moved to `IN_PROGRESS` on 2026-06-26 as the Joe-side anchor
- `f36c3ca5-31c3-4e6c-9a52-3fe683effccd` was closed on 2026-06-26 as a stale, source-specific Intervals sync report after validation showed the cited workout exists in Coach Wattz as a Strava workout and the user still had newer Intervals workouts after the report date

Useful historical references already resolved:

- `f35c3d5f-9bfb-4849-aeca-ae4ca7a01f16`
- `a414d18c-1f42-4155-a22b-0e923d0015ac`
- `ce746725-c17a-47ac-bbcf-49b8371a0ef6`
- `4dd1cf39-6cb9-4e2c-925d-7285b174f2ab`

Next steps:

- inspect structure generation, storage, and rendering paths together
- determine whether missing steps and broken display share one root cause or multiple
- use the resolved April tickets as comparison cases

### 4. Data Quality, Metrics, And Deduplication

Status:

- in progress

Scope:

- duplicate workout handling
- incorrect power/elevation/zone/intensity metrics
- chart and aggregate mismatches

Representative tickets:

- `c5e9c90d-195e-4cad-aa8e-49f9148bfe57`
- `605032e8-4bfc-4b2d-bc4f-fdfd6515638d`
- `61d438f4-2d8a-430e-ab24-8d2c57fa7b07`
- `6f933f13-4d8e-426c-8eb9-b4239a95346c`

Current findings:

- `c5e9c90d-195e-4cad-aa8e-49f9148bfe57` was moved to `IN_PROGRESS` on 2026-06-26 after production validation confirmed a real workout-metrics data-quality issue: stored workout `114a2ffd-b1d2-4f51-a856-1c1a383957e3` currently has `elevationGain = 318`, while the raw Intervals payload contains obviously corrupted altitude values around `19963-20019` and inconsistent elevation totals for what the user reported as a flat run. A second pass on 2026-06-26 nulled corrupt elevation gain on the cited workout plus one adjacent Intervals record for the same user and added code/backfill guards for absurd altitude metadata beyond the existing `-500` sentinel check. Ticket remains open pending deploy of the ingestion guard.
- `605032e8-4bfc-4b2d-bc4f-fdfd6515638d` was moved to `IN_PROGRESS` on 2026-06-26 after production validation confirmed the sedentary setting is stored correctly (`activityLevel = SEDENTARY`, `bmr = 1600`, `targetAdjustmentPercent = -15`), but rest-day nutrition rows can still resolve to inflated calorie goals because the rest-day fueling path falls back to macro-calorie totals instead of preserving the lower sedentary energy target. A second pass on 2026-06-26 confirmed the 2026-06-22 rest day still shows `caloriesGoal = 2604` despite breakdown fields `baseCalories = 1920` and `adjustmentCalories = -288` (expected `1632`). Code fix now uses the energy breakdown total on zero-activity days; ticket remains open pending deploy and fueling-plan refresh.
- `e94d9003-69f5-454f-b35b-9b296100e797` was resolved on 2026-06-26 after production revalidation showed the duplicate cluster normalized to canonical Intervals workout `d33a5771-b2b9-4aa9-94b6-5cd09661dcda` with correct power/energy metrics; Garmin and Strava duplicates remain marked `isDuplicate = true` but no longer drive primary UX
- `539f2504-dc14-45f8-9f06-126738060117` was closed on 2026-06-26 and moved out of the bug queue because it is a product request to prefer pace-based run targeting for future workouts, not a current data-quality or deduplication defect
- `d2563a93-06a7-4477-87de-18f462c3dca7` was closed on 2026-06-26 as stale after production validation could no longer reproduce the cited weekly plan state; the named workouts no longer exist in that week and matching titles only appear on unrelated legacy/template-like dates or later plan dates
- `2e217b37-abeb-4b92-bc82-b8b7f01e7637` was closed on 2026-06-26 as a duplicate-style Intervals planned-workout publish/update report and folded into the deferred out-of-scope publish-trigger family alongside `221c609f-ae1c-4020-b4cc-d61d059d39e9`
- `66b474a5-7a39-43a9-a8ef-11da0db5a9ca` was closed on 2026-06-26 after production validation showed the reported 2026-04-28 triplicate workout case is already normalized in current data, with two workouts marked as duplicates of canonical workout `1df4cfc0-2504-42b4-b259-517cdbf630f1`
- `ee4e6641-c4f6-4382-9210-ae8556025145` was closed on 2026-06-26 as stale after production validation found the account timezone stored correctly as `America/Winnipeg` and could not match the older report to a current future-dated backend workout or metric-history row
- `3c6b08b7-8969-41be-a346-7d1319f5968e` was closed on 2026-06-26 and moved out of the bug queue because the current bike-power display symptom no longer reproduces cleanly and the remaining run-side request is a product preference to use heart rate instead of power for future targets
- `61d438f4-2d8a-430e-ab24-8d2c57fa7b07` and `6f933f13-4d8e-426c-8eb9-b4239a95346c` were intentionally left untouched in this pass because they center on AI/readiness interpretation rather than the low-risk non-generative bug cleanup currently in scope

Next steps:

- deploy the sedentary rest-day calorie fix and refresh affected nutrition rows for Josué
- deploy the extended Intervals altitude validation and run broader elevation backfill if needed
- split ingestion-caused bad data from calculation/aggregation defects
- group duplicate-workout bugs together rather than leaving them mixed with sync issues
- prioritize defects that change user-visible numbers over cosmetic analytics requests

### 5. External Integrations Beyond Intervals

Status:

- queued

Scope:

- Huawei Health
- Yazio
- Health Sync
- possible Garmin-only or app-open issues not covered by Intervals work

Representative tickets:

- `83aa04e3-9acc-452c-9d3d-9aa411125efd`

Current findings:

- `ef97261b-9371-4404-8e53-014f4fc92b17` was closed on 2026-06-26 as an operational/support issue because it is a Huawei Health app-opening troubleshooting request rather than a Coach Wattz backend defect
- `c2ffb483-4f97-47c4-99f0-afb454c81536` was closed on 2026-06-26 as a setup/reconnect support issue after production validation found no active Yazio integration on the account
- `027da730-6d37-4683-9637-a8c0d595bdb3` was closed on 2026-06-26 as a source/setup mismatch support case after production validation found wellness rows on the account but no dedicated Health Sync integration row
- `83aa04e3-9acc-452c-9d3d-9aa411125efd` was closed on 2026-06-26 as stale after production validation showed current Intervals wellness data present again through 2026-06-22, including sleepScore, HRV, and restingHr values
- `b73a0d10-558a-4b5b-87fe-277a9d2548e4` was closed on 2026-06-26 after the user confirmed removing Strava resolved duplicate activities; production now shows garmin + intervals only
- `05613804-5306-49c4-b0f4-73573eecb3db` was closed on 2026-06-26 as a duplicate-style follow-up of `b73a0d10-558a-4b5b-87fe-277a9d2548e4`

Next steps:

- keep external app-opening, reconnect, and source-mapping cases out of the engineering bug queue unless current production data points to an active ingestion defect

### 6. Chat Availability And AI Quality

Status:

- queued

Important distinction:

- chat uptime and request failures are bug backlog items
- AI correctness issues are valid defects, but should not be conflated with chat outages

Sub-groups:

- chat availability:
  - `6895d6a0-f4b9-466e-9caf-2bdb54464d90`
  - `eef22f81-ed15-4282-a5a0-bef89ee07a4e`
- workout analysis correctness:
  - `dacd72e1-fc2d-42ca-baec-629f14806fa5`
  - `015fb174-0957-4d1d-aadb-d11127507b83`
- temporal reasoning and context quality:
  - `e95af730-3322-4dbd-a4e9-98558a993211`
  - `c98c8a28-181f-43c0-b760-8ac0d76bfbf4`
- Telegram-specific behavior:
  - `13b95016-2b92-4414-9bbf-ce56b903b7f1`
- workout-generation quality failures:
  - `2126937b-9a3a-4b90-8e8d-5a6e57a60340`
  - `60c92753-7637-4a46-bbec-8aef3322f326`
  - `6042136c-4082-49ed-b9bb-7fd9d7c088dd`
  - `f906d604-fdd8-4fd4-b446-26cdff7529c0`

Next steps:

- merge the obvious same-day chat duplicates
- separate prompt/model quality bugs from frontend chat availability issues
- review workout-generation failures alongside structured workout pipeline issues where relevant

## Excluded From Engineering Bug Backlog

### Feature Requests

These should be tracked separately from bug-fix execution:

- `da87107d-304b-4ef5-8857-91374ad2d35d` AI coach access to workout library
- `25b50490-1753-4090-99cb-7249ffeb9144` filter all cycling activities combined
- `592855b1-7725-4849-8c3a-8ed6c1ac5cd0` integrate workout energy expenditure into dashboard
- `c7fb0210-2535-4995-b01d-c2f540962cd0` map-linking and free-form power stats
- `36e8f7b5-eb20-44ae-942e-029466a8cce6` map-linking and sub-metrics for peak-power stats

Tracking:

- feature-request tickets are now mirrored in [support-feature-request-tracker-2026-06-25.md](./support-feature-request-tracker-2026-06-25.md) so they can be removed from the engineering bug backlog without losing product context
- the above feature-request tickets were closed on 2026-06-25 after internal notes and polite user-facing responses were added

### Operational Or Support-Only Tasks

These should not sit in the bug backlog:

- `9f3975a4-55fd-40c5-a757-d420a95e9424` account deletion request
- `b20dbdce-f330-4c1b-ba9e-1b0effad4806` account deactivation request

Status:

- both account-operation tickets above were closed on 2026-06-25 after being reclassified as support/admin workflow items rather than engineering defects

### Needs Separate Validation Before Bug Routing

- `86197b3a-9527-4b11-b0a0-976f210367b2` app inaccessible

This may be a real availability incident, but it should be validated as platform uptime or access failure rather than mixed into general product bugs by default.

## Internal Ticket Update Plan

Internal notes should be kept on the canonical or anchor tickets so support can see which engineering track owns the issue.

Recommended internal-note targets:

- `05c440b8-416c-4352-b750-1eb77061a90a` Ralf sync master
- `4076711c-d3e5-40fa-823b-f5b6f02081e8` Dzmitry sync master candidate
- `31cf00a6-f276-456b-aa74-b44b8b2d575e` privacy-risk follow-up
- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` structured workout/rendering cluster
- `10565730-46cd-4422-bef3-edf8b16d7df7` Billy-side structure anchor
- `094c9607-f15f-49ff-b713-11f66cfcde15` Benoit-side structure anchor
- `5b04e4cb-04f7-4fdf-999f-a94f049b9340` Joe-side structure anchor

Internal notes should capture:

- active engineering workstream
- related ticket IDs
- whether code has already been changed
- what still needs verification or follow-up

## Immediate Next Steps

1. Repair the local test/runtime environment so regression tests can run.
2. Keep consolidating the sync ticket families under the selected master incidents.
3. Start the structured workout and activity-rendering investigation as the next patching track.
4. Keep feature requests and support-only tasks out of the engineering bug queue.
