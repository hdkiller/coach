# Support Ticket Handoff - 2026-06-25

Last updated: 2026-06-30 (fourth pass)

## Purpose

This document is the quick-start handoff for a new context.

Read this first if the goal is to continue support-ticket triage, cleanup, or bug-fix prioritization without replaying the full investigation history.

## Source Documents

- [support-ticket-task-list-2026-06-16.md](./support-ticket-task-list-2026-06-16.md)
- [support-ticket-investigation-2026-06-16.md](./support-ticket-investigation-2026-06-16.md)
- [support-ticket-triage-2026-06-16.md](./support-ticket-triage-2026-06-16.md)
- [support-feature-request-tracker-2026-06-25.md](./support-feature-request-tracker-2026-06-25.md)

## What Was Completed

Engineering and ticket-management progress already made:

- workout access-hardening changes were implemented and previously committed
- Intervals sync hardening was implemented and previously committed
- activity/rendering hardening was implemented and previously committed
- several stale sync tickets were investigated, annotated, and closed
- several feature requests were removed from the engineering bug queue, politely closed, and copied into the feature-request tracker
- account-operation tickets were removed from the engineering bug queue and closed as support/admin workflow items
- the Garmin reconnect-style ticket was closed as operational/support rather than kept as an engineering defect

## Tickets Closed In The Latest Cleanup

Closed as stale or duplicate-style sync reports:

- `8f567102-c948-4039-8e73-5fe60f9f9047`
- `d46cdb78-c9d3-427d-9bb1-289debbaca35`
- `8d59d539-0021-4530-8dc8-e13161d752c0`
- `e4812fc8-7053-4fc4-ac2b-92aa39d69479`
- `fd7c42ec-19f1-4a15-bde9-4ffd223af28d`
- `f36c3ca5-31c3-4e6c-9a52-3fe683effccd`

Resolved as a fixed sync/configuration issue:

- `85182d74-4ba2-469b-bd89-1f56857f6a51`

Closed as stale or duplicate-style activity/rendering reports:

- `eeccc4ba-554c-4475-a457-72dfcbba8f73`
- `99e9b58a-ac01-44f2-bd61-11b22a3876fc`
- `fcc8048a-e902-4d8f-a99a-902c0cb08442`
- `2963ef72-0fe5-4439-8984-3fe2647f1034`
- `0eb3e1a5-101d-4746-91b3-0e9529195072`

Closed as feature requests:

- `da87107d-304b-4ef5-8857-91374ad2d35d`
- `25b50490-1753-4090-99cb-7249ffeb9144`
- `592855b1-7725-4849-8c3a-8ed6c1ac5cd0`
- `c7fb0210-2535-4995-b01d-c2f540962cd0`
- `36e8f7b5-eb20-44ae-942e-029466a8cce6`

Closed as support or operational items:

- `9f3975a4-55fd-40c5-a757-d420a95e9424`
- `b20dbdce-f330-4c1b-ba9e-1b0effad4806`
- `0686046e-ac48-4411-b7fe-0783ee13e410`
- `ef97261b-9371-4404-8e53-014f4fc92b17`
- `c2ffb483-4f97-47c4-99f0-afb454c81536`
- `027da730-6d37-4683-9637-a8c0d595bdb3`
- `b73a0d10-558a-4b5b-87fe-277a9d2548e4`
- `05613804-5306-49c4-b0f4-73573eecb3db`
- `fec5b9ae-5a3b-46af-af24-507efdcb0abd`

## Open Ticket Queue (2026-06-30)

Eight tickets remain open in production:

| Status           | ID                                     | Title                                               | User                       |
| ---------------- | -------------------------------------- | --------------------------------------------------- | -------------------------- |
| `IN_PROGRESS`    | `399586e0-4619-45d7-9c0c-c04b69800709` | Workouts not syncing to Garmin Connect              | xavier.cottereau@gmail.com |
| `IN_PROGRESS`    | `68718e9e-2a21-41f2-9096-ff7afa7f7cdb` | Wahoo Upload Failed for Tuesday Workout             | nikoplaas@googlemail.com   |
| `NEED_MORE_INFO` | `05c440b8-416c-4352-b750-1eb77061a90a` | Bridge Sync Failure (Intervals -> AI)               | ralf.gieske@googlemail.com |
| `NEED_MORE_INFO` | `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` | Structure rendering in Activity/Calendar            | dzmitrysuravets@gmail.com  |
| `IN_PROGRESS`    | `a232e0ab-245e-4e95-ac37-e03fa7db6e37` | Workout steps missing (Philippe anchor)             | philippe@delodder.be       |
| `IN_PROGRESS`    | `10565730-46cd-4422-bef3-edf8b16d7df7` | Manual exercise structure not saving (Billy anchor) | warusk2nd@gmail.com        |
| `IN_PROGRESS`    | `094c9607-f15f-49ff-b713-11f66cfcde15` | Structure generation (Benoit anchor)                | benoit.naturel@mailo.com   |
| `IN_PROGRESS`    | `5b04e4cb-04f7-4fdf-999f-a94f049b9340` | Missing workout structure (Joe anchor)              | jost.kastanavius@posteo.eu |

Recently resolved since the 2026-06-26 pass:

- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34` — activity tab rendering; deploy verified 2026-06-29
- `65aa4f0a-9f0d-450d-ac81-83dcd14cea4c` — calendar late-day fetch bounds; deploy verified 2026-06-29
- `c5e9c90d-195e-4cad-aa8e-49f9148bfe57` — corrupt Intervals altitude ingestion; deploy verified 2026-06-29
- `605032e8-4bfc-4b2d-bc4f-fdfd6515638d` — sedentary rest-day calories; deploy verified 2026-06-29
- `221c609f-ae1c-4020-b4cc-d61d059d39e9` — closed (out-of-scope Intervals publish)

## What Remains Actively Relevant

Highest-value remaining non-chat, non-workout-generation items:

### 1. Sync Reliability And Ingestion

New operational tickets (2026-06-30 pass):

- `399586e0-4619-45d7-9c0c-c04b69800709` — Garmin OAuth token expired (`invalid_grant`); zero `PlannedWorkoutPublishTarget` rows for `garmin`. User must reconnect Garmin in Settings, then publish planned workouts manually. Not a publish-code defect.
- `68718e9e-2a21-41f2-9096-ff7afa7f7cdb` — user has Intervals only (no Wahoo integration). June 23 strength workout synced to Intervals but has no structure. "Wahoo upload failed" likely head-unit/Intervals bridge; awaiting user clarification.
- `05c440b8-416c-4352-b750-1eb77061a90a` — moved to `NEED_MORE_INFO` after 2026-06-30 validation: Intervals sync SUCCESS, wellness current through 2026-06-30, latest workout 2026-06-29. Awaiting athlete confirmation sync is stable.

Out-of-scope sync item (closed):

- `221c609f-ae1c-4020-b4cc-d61d059d39e9` — affects planned-workout publishing to Intervals; workout-generation/publish-trigger work deferred

Most relevant sync note from the 2026-06-26 pass:

- `85182d74-4ba2-469b-bd89-1f56857f6a51` was resolved after confirming `ingestWorkouts = false`, re-enabling Intervals workout ingestion, and running a historical activity import
- the fix created 135 new Intervals workouts and extended the user's imported Intervals history from `2026-01-19` to `2026-06-24`

### 2. Activity Tab And Workout Rendering

Current anchor tickets:

- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`
- `a232e0ab-245e-4e95-ac37-e03fa7db6e37`
- `10565730-46cd-4422-bef3-edf8b16d7df7`
- `094c9607-f15f-49ff-b713-11f66cfcde15`
- `5b04e4cb-04f7-4fdf-999f-a94f049b9340`

Why this is still a good workstream:

- code hardening already landed
- user wanted to avoid workout-generation trigger changes
- this cluster is still product-visible and likely patchable without crossing into the deferred trigger work
- `eeccc4ba-554c-4475-a457-72dfcbba8f73` was closed on 2026-06-26 as a same-day duplicate-style follow-up of `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34`
- `99e9b58a-ac01-44f2-bd61-11b22a3876fc` was closed on 2026-06-26 after current production data showed recent activities present again
- `fcc8048a-e902-4d8f-a99a-902c0cb08442` was closed on 2026-06-26 after fresh production validation showed recent activities present again for that user
- `2963ef72-0fe5-4439-8984-3fe2647f1034` was closed on 2026-06-26 after fresh production validation showed current workouts present again and no evidence of a broad ongoing display outage
- `d1f6ddbd-90b6-4bc6-aac7-7b87771bfa34` was resolved on 2026-06-29 after activity rendering deploy (run 28376183395)
- `0d62fa04-884d-4fcd-a328-2226f2eb4ad5` moved to `NEED_MORE_INFO` on 2026-06-30; cited June workouts have steps (9/2/13), rendering deploy live, 7 zero-step records remain as historical data
- `a232e0ab-245e-4e95-ac37-e03fa7db6e37` remains open as the Philippe-side canonical anchor because that account still shows a large active pattern of zero-step structured workouts across multiple types
- `d3512b30-86a2-493d-beff-ab6fdb66378d` was closed on 2026-06-26 because the exact cited workout no longer exists and the remaining nearby structure issue is better tracked under `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`
- `10565730-46cd-4422-bef3-edf8b16d7df7` remains open as the Billy-side canonical anchor; root cause fixed and deployed in `e3ef5c22` via [CI #28385768486](https://github.com/hdkiller/coach/actions/runs/28385768486); production still has 27 zero-step + 102 no-structure planned workouts since April (legacy data); pending Billy verification of new saves
- `17ee0ba8-5355-46b0-a67a-875c6d015036` was closed on 2026-06-26 after the cited workout showed structure again, with the broader Billy-side issue folded into `10565730-46cd-4422-bef3-edf8b16d7df7`
- `094c9607-f15f-49ff-b713-11f66cfcde15` remains open as the Benoit-side anchor because many recent planned workouts on that account still have missing structure data, including repeated `has_structure = false` and `step_count = 0` cases from mid-June onward
- `5b04e4cb-04f7-4fdf-999f-a94f049b9340` remains open as the Joe-side anchor because the exact cited workout now has structure again, but the same account still shows a broad active pattern of missing structure across many later records from early May through late June

### 3. Data Quality And Deduplication

Resolved since 2026-06-29 deploy (run 28376183395):

- `c5e9c90d-195e-4cad-aa8e-49f9148bfe57` — corrupt Intervals altitude ingestion guard live; cited workout elevationGain nulled
- `605032e8-4bfc-4b2d-bc4f-fdfd6515638d` — sedentary rest-day calorie fix live; stored rows refresh on fueling-plan recalc

Remaining dedup anchors (if still open elsewhere):

- `61d438f4-2d8a-430e-ab24-8d2c57fa7b07`
- `6f933f13-4d8e-426c-8eb9-b4239a95346c`

Most relevant notes from the 2026-06-26 pass:

- `c5e9c90d-195e-4cad-aa8e-49f9148bfe57` confirmed real bad-metrics issue: stored workout had `elevationGain = 318` with corrupted Intervals altitude metadata
- `605032e8-4bfc-4b2d-bc4f-fdfd6515638d` confirmed sedentary setting stored correctly but rest-day `caloriesGoal` inflated by macro totals
- `e94d9003-69f5-454f-b35b-9b296100e797` was resolved on 2026-06-26 after production revalidation showed the duplicate cluster normalized to canonical Intervals workout `d33a5771-b2b9-4aa9-94b6-5cd09661dcda` with correct power/energy metrics
- `539f2504-dc14-45f8-9f06-126738060117` was closed on 2026-06-26 and moved to the feature-request tracker because it asks for a product-level change in how future running targets are prescribed, not a current data-quality or deduplication defect
- `d2563a93-06a7-4477-87de-18f462c3dca7` was closed on 2026-06-26 as stale after production validation could no longer reproduce the cited weekly plan state; the named workouts no longer exist in that week and matching titles only appear on unrelated legacy/template-like dates or later plan dates
- `2e217b37-abeb-4b92-bc82-b8b7f01e7637` was closed on 2026-06-26 as a duplicate-style Intervals planned-workout publish/update report and folded into the deferred out-of-scope publish-trigger family alongside `221c609f-ae1c-4020-b4cc-d61d059d39e9`
- `66b474a5-7a39-43a9-a8ef-11da0db5a9ca` was closed on 2026-06-26 after production validation showed the reported 2026-04-28 triplicate workout case is already normalized in current data, with two workouts marked as duplicates of the canonical record
- `ee4e6641-c4f6-4382-9210-ae8556025145` was closed on 2026-06-26 as stale after production validation found the account timezone stored correctly as `America/Winnipeg` and could not match the older report to a current future-dated backend workout or metric-history row
- `3c6b08b7-8969-41be-a346-7d1319f5968e` was closed on 2026-06-26 and moved to the feature-request tracker because the current bike-power display symptom no longer reproduces cleanly and the remaining run-side request is a product preference to use heart rate instead of power for future targets

### 4. External Integrations Beyond Intervals

Most relevant notes from the 2026-06-26 pass:

- `ef97261b-9371-4404-8e53-014f4fc92b17` was closed as an operational/support item because it is a Huawei Health app-opening troubleshooting request rather than a Coach Wattz backend defect
- `c2ffb483-4f97-47c4-99f0-afb454c81536` was closed as a setup/reconnect support issue after production validation found no active Yazio integration on the account
- `027da730-6d37-4683-9637-a8c0d595bdb3` was closed as a source/setup mismatch support case after production validation found no dedicated Health Sync integration row on the account
- `83aa04e3-9acc-452c-9d3d-9aa411125efd` was closed as stale after production validation showed current Intervals wellness data present again through 2026-06-22
- `b73a0d10-558a-4b5b-87fe-277a9d2548e4` was closed on 2026-06-26 after the user confirmed removing Strava resolved duplicate activities; production now shows garmin + intervals only
- `05613804-5306-49c4-b0f4-73573eecb3db` was closed on 2026-06-26 as a duplicate-style follow-up of `b73a0d10-558a-4b5b-87fe-277a9d2548e4`
- `fec5b9ae-5a3b-46af-af24-507efdcb0abd` was closed on 2026-06-26 as stale after production validation found the cited 2026-05-28 Strava run present again

## Explicit Scope Constraints

Keep these constraints active unless the user changes direction:

- skip chat-related tickets for now
- skip workout-generation and publish-trigger changes for now
- focus on bugs, stale ticket cleanup, and operational triage rather than new features

## Ticket-System Caveat

The CLI does not currently support a `DUPLICATE` status even though the support guide mentions it.

Available close states seen in practice:

- `OPEN`
- `IN_PROGRESS`
- `NEED_MORE_INFO`
- `RESOLVED`
- `CLOSED`

Practical workflow used in this pass:

- add an internal note describing the duplicate or stale rationale
- add a polite user-facing message
- close the ticket as `CLOSED`

## Test Environment Note

The test environment now runs again.

What was verified:

- targeted Vitest execution works
- `tests/unit/server/utils/analyticsScope.test.ts` passes
- `tests/unit/server/utils/intervals-sync.test.ts` partially fails because the mock setup is outdated, not because the environment is broken
- `server/utils/intervals.test.ts` and `tests/unit/server/utils/nutrition-domain/fueling-plan.test.ts` pass for the 2026-06-26 data-quality fixes (now deployed 2026-06-29)

Important implication:

- do not keep saying tests are blocked by environment setup
- the remaining issue is test maintenance, not inability to execute tests

## Recommended Next Moves In A Fresh Context

1. Follow up on `NEED_MORE_INFO` tickets (`05c440b8`, `0d62fa04`) — close as `RESOLVED` if users confirm sync/rendering is fixed.
2. Close `10565730` after Billy confirms manual Gym structure saves work post-`e3ef5c22` deploy.
3. Operational: guide Xavier (`399586e0`) through Garmin reconnect + manual publish; no code fix needed unless reconnect fails.
4. Clarify Niko Wahoo ticket (`68718e9e`) — connect Wahoo integration vs Intervals→head-unit bridge failure.
5. Structure cluster (`a232e0ab`, `094c9607`, `5b04e4cb`) — historical zero-step repair needs workout-generation scope; empty-content guard prevents new bad writes.
6. Keep all new feature requests out of the engineering bug queue and record them in [support-feature-request-tracker-2026-06-25.md](./support-feature-request-tracker-2026-06-25.md).
