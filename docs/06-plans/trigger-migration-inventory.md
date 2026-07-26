# Background Task & Trigger Migration Inventory

This document tracks all background tasks implemented in Coach Watts, their capabilities, queue assignments, dependency decoupling status, and migration status for supporting **Redis/BullMQ (`cw:worker`)** alongside or in place of **Trigger.dev** (specifically for self-hosted instances or self-managed queue infrastructure).

---

## Architecture Overview

Coach Watts supports two execution modes for background tasks:

1. **Trigger.dev Driver (`TASK_QUEUE_DRIVER=trigger`)**: Dispatches tasks to Trigger.dev Cloud/Self-Hosted platform using `@trigger.dev/sdk/v3`. Used by default in cloud production.
2. **Redis/BullMQ Driver (`TASK_QUEUE_DRIVER=redis`)**: Dispatches tasks to local Redis queues processed by `cw:worker` ([`cli/worker/start.ts`](file:///Users/hdkiller/Develop/coach-wattz/cli/worker/start.ts)). Enables running the full application stack without external SaaS dependencies in self-hosted deployments.

---

## Migration Status Legend

| Status                   | Description                                                                                                                                                                                   |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 **BullMQ Native**     | Currently runs natively on Redis/BullMQ in `cw:worker` (e.g. webhooks, pings, streams).                                                                                                       |
| 🟡 **Service Decoupled** | Task business logic is isolated in `server/utils/services/*`. Ready to be wrapped by a BullMQ handler.                                                                                        |
| 🟠 **Trigger.dev Only**  | Task logic is tightly coupled within `task({ run: ... })` in [`trigger/`](file:///Users/hdkiller/Develop/coach-wattz/trigger). Needs logic extraction into a service before BullMQ migration. |
| 🔵 **Cron / Schedule**   | Task is triggered on a cron schedule (`schedules.task`). Requires BullMQ `repeat` / repeatable job registration.                                                                              |

---

## Complete Task Inventory

### 1. Data Ingestion & Integration Sync (23 Tasks)

| Task Identifier                | File Link                                                                                                                       | Queue            | Schedule             | Capability / Purpose                                                            | Decoupled?                  | Migration Status                  |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :--------------- | :------------------- | :------------------------------------------------------------------------------ | :-------------------------- | :-------------------------------- |
| `ingest-all`                   | [`trigger/ingest-all.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-all.ts)                                     | `user-ingestion` | Manual / Post-Login  | Master orchestrator syncing all connected user integrations sequentially.       | Yes                         | 🟡 Service Decoupled              |
| `ingest-strava`                | [`trigger/ingest-strava.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-strava.ts)                               | `user-ingestion` | On Demand            | Syncs Strava activity history for a user.                                       | Yes (`StravaService`)       | 🟡 Service Decoupled              |
| `ingest-strava-activity`       | [`trigger/ingest-strava-activity.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-strava-activity.ts)             | `user-ingestion` | Webhook              | Ingests a single Strava activity by ID.                                         | Yes (`StravaService`)       | 🟡 Service Decoupled              |
| `ingest-strava-streams`        | [`trigger/ingest-strava-streams.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-strava-streams.ts)               | `user-ingestion` | Post-Ingest          | Ingests detailed telemetry streams (HR, power, cadence) for Strava activities.  | Yes (`StravaService`)       | 🟡 Service Decoupled              |
| `ingest-garmin`                | [`trigger/ingest-garmin.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-garmin.ts)                               | `user-ingestion` | On Demand            | Syncs Garmin activity and daily wellness summaries.                             | Yes (`GarminService`)       | 🟡 Service Decoupled              |
| `ingest-fitbit`                | [`trigger/ingest-fitbit.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-fitbit.ts)                               | `user-ingestion` | Webhook              | Syncs Fitbit activity, sleep, HRV, and weight metrics.                          | Yes (`FitbitService`)       | 🟡 Service Decoupled              |
| `ingest-whoop`                 | [`trigger/ingest-whoop.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-whoop.ts)                                 | `user-ingestion` | Webhook              | Syncs Whoop strain, recovery, sleep, and physiological metrics.                 | Yes (`WhoopService`)        | 🟡 Service Decoupled              |
| `ingest-oura`                  | [`trigger/ingest-oura.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-oura.ts)                                   | `user-ingestion` | Webhook              | Syncs Oura sleep, readiness, stress, SpO2, and VO2 Max data.                    | Yes (`OuraService`)         | 🟡 Service Decoupled              |
| `ingest-intervals`             | [`trigger/ingest-intervals.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-intervals.ts)                         | `user-ingestion` | Webhook / On Demand  | Syncs workouts and daily wellness metrics from Intervals.icu.                   | Yes (`IntervalsService`)    | 🟡 Service Decoupled              |
| `ingest-intervals-streams`     | [`trigger/ingest-intervals-streams.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-intervals-streams.ts)         | `user-ingestion` | Post-Ingest          | Fetches high-resolution streams from Intervals.icu.                             | Yes (`IntervalsService`)    | 🟢 BullMQ Native (`streamsQueue`) |
| `ingest-withings`              | [`trigger/ingest-withings.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-withings.ts)                           | `user-ingestion` | Webhook              | Syncs body weight, fat percentage, and blood pressure from Withings scales.     | Yes (`WithingsService`)     | 🟡 Service Decoupled              |
| `ingest-yazio`                 | [`trigger/ingest-yazio.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-yazio.ts)                                 | `user-ingestion` | Sync / Manual        | Ingests daily meal logs and macro totals from Yazio.                            | Yes (`YazioService`)        | 🟡 Service Decoupled              |
| `ingest-hevy`                  | [`trigger/ingest-hevy.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-hevy.ts)                                   | `user-ingestion` | Webhook              | Syncs weightlifting workouts and exercise sets from Hevy.                       | Yes (`HevyService`)         | 🟡 Service Decoupled              |
| `ingest-liftosaur`             | [`trigger/ingest-liftosaur.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-liftosaur.ts)                         | `user-ingestion` | Webhook              | Ingests strength workout sessions from Liftosaur.                               | Yes (`LiftosaurService`)    | 🟡 Service Decoupled              |
| `ingest-polar`                 | [`trigger/ingest-polar.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-polar.ts)                                 | `user-ingestion` | Webhook              | Syncs Polar Flow exercise sessions and daily biometrics.                        | Yes (`PolarService`)        | 🟡 Service Decoupled              |
| `ingest-rouvy`                 | [`trigger/ingest-rouvy.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-rouvy.ts)                                 | `user-ingestion` | On Demand            | Syncs Rouvy indoor virtual rides.                                               | Yes (`RouvyService`)        | 🟡 Service Decoupled              |
| `ingest-rouvy-fit`             | [`trigger/ingest-rouvy-fit.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-rouvy-fit.ts)                         | `user-ingestion` | Manual Upload        | Parses raw FIT files exported from Rouvy.                                       | Partial                     | 🟠 Trigger.dev Only               |
| `ingest-ultrahuman`            | [`trigger/ingest-ultrahuman.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-ultrahuman.ts)                       | `user-ingestion` | Webhook              | Ingests Ultrahuman Ring sleep and movement data.                                | Yes (`UltrahumanService`)   | 🟡 Service Decoupled              |
| `poll-ultrahuman`              | [`trigger/poll-ultrahuman.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/poll-ultrahuman.ts)                           | `user-ingestion` | Cron (`0 */2 * * *`) | Periodically polls Ultrahuman API for users without active webhooks.            | Yes (`UltrahumanService`)   | 🔵 Cron / Schedule                |
| `ingest-wahoo`                 | [`trigger/ingest-wahoo.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-wahoo.ts)                                 | `user-ingestion` | Webhook              | Syncs Wahoo SYSTM/ELEMNT workout activities.                                    | Yes (`WahooService`)        | 🟡 Service Decoupled              |
| `ingest-fit-file`              | [`trigger/ingest-fit-file.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/ingest-fit-file.ts)                           | `user-ingestion` | File Upload          | Parses binary `.FIT` workout files and reconstructs missing sessions.           | Yes (`server/utils/fit.ts`) | 🟡 Service Decoupled              |
| `garmin-backfill`              | [`trigger/garmin-backfill.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/garmin-backfill.ts)                           | `user-ingestion` | Admin Tool           | Triggers historical data backfill for Garmin accounts.                          | Yes (`GarminService`)       | 🟡 Service Decoupled              |
| `autodetect-intervals-profile` | [`trigger/autodetect-intervals-profile.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/autodetect-intervals-profile.ts) | `user-ingestion` | OAuth Callback       | Auto-discovers and attaches athlete ID for newly linked Intervals.icu accounts. | Yes (`IntervalsService`)    | 🟡 Service Decoupled              |

---

### 2. AI Analysis & Performance Analytics (12 Tasks)

| Task Identifier               | File Link                                                                                                                     | Queue             | Schedule            | Capability / Purpose                                                            | Decoupled?               | Migration Status     |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :---------------- | :------------------ | :------------------------------------------------------------------------------ | :----------------------- | :------------------- |
| `analyze-workout`             | [`trigger/analyze-workout.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-workout.ts)                         | `user-analysis`   | Post-Ingest         | Deep AI analysis of completed workout (zone compliance, pacing, fatigue).       | Partial                  | 🟠 Trigger.dev Only  |
| `analyze-last-3-workouts`     | [`trigger/analyze-last-3-workouts.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-last-3-workouts.ts)         | `user-analysis`   | On Demand           | Short-term 3-workout trend analysis and workload accumulation evaluation.       | Partial                  | 🟠 Trigger.dev Only  |
| `analyze-plan-adherence`      | [`trigger/analyze-plan-adherence.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-plan-adherence.ts)           | `user-analysis`   | Post-Ingest         | Compares completed execution metrics against planned structured intervals.      | Partial                  | 🟠 Trigger.dev Only  |
| `deduplicate-workouts`        | [`trigger/deduplicate-workouts.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/deduplicate-workouts.ts)               | `user-background` | Post-Ingest         | Merges identical workouts recorded simultaneously across multiple integrations. | Yes (`workoutService`)   | 🟡 Service Decoupled |
| `analyze-nutrition`           | [`trigger/analyze-nutrition.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-nutrition.ts)                     | `user-analysis`   | Post-Ingest         | Evaluates daily macronutrient intake vs training demand.                        | Partial                  | 🟠 Trigger.dev Only  |
| `analyze-last-3-nutrition`    | [`trigger/analyze-last-3-nutrition.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-last-3-nutrition.ts)       | `user-analysis`   | On Demand           | 3-day nutrition consistency analysis.                                           | Partial                  | 🟠 Trigger.dev Only  |
| `analyze-last-7-nutrition`    | [`trigger/analyze-last-7-nutrition.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-last-7-nutrition.ts)       | `user-analysis`   | On Demand           | Weekly nutrition and energy balance evaluation.                                 | Partial                  | 🟠 Trigger.dev Only  |
| `finalize-daily-nutrition`    | [`trigger/finalize-daily-nutrition.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/finalize-daily-nutrition.ts)       | `user-analysis`   | Cron (`0 23 * * *`) | Summarizes, locks, and stores finalized nutrition score for the day.            | Yes (`nutritionService`) | 🔵 Cron / Schedule   |
| `nutrition-last-call`         | [`trigger/nutrition-last-call.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/nutrition-last-call.ts)                 | `user-analysis`   | Cron (`0 20 * * *`) | Evening push notification reminding athletes to log missing dinner/fueling.     | Yes (`nutritionService`) | 🔵 Cron / Schedule   |
| `analyze-wellness`            | [`trigger/analyze-wellness.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/analyze-wellness.ts)                       | `user-analysis`   | Post-Ingest         | Evaluates sleep quality, resting HR, and HRV recovery status.                   | Yes (`wellnessService`)  | 🟡 Service Decoupled |
| `generate-athlete-profile`    | [`trigger/generate-athlete-profile.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-athlete-profile.ts)       | `user-analysis`   | Periodic / Manual   | Builds comprehensive multi-week athletic summary (strengths, limits, profile).  | Partial                  | 🟠 Trigger.dev Only  |
| `generate-score-explanations` | [`trigger/generate-score-explanations.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-score-explanations.ts) | `user-analysis`   | On Demand           | Provides plain-text AI explanations for readiness and fitness score shifts.     | Partial                  | 🟠 Trigger.dev Only  |

---

### 3. Training Plan & Structured Workout Generation (14 Tasks)

| Task Identifier               | File Link                                                                                                                     | Queue             | Schedule     | Capability / Purpose                                                                   | Decoupled? | Migration Status    |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :---------------- | :----------- | :------------------------------------------------------------------------------------- | :--------- | :------------------ |
| `generate-weekly-plan`        | [`trigger/generate-weekly-plan.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-weekly-plan.ts)               | `user-background` | On Demand    | Generates a 7-day periodized training plan tailored to user goals and availability.    | Partial    | 🟠 Trigger.dev Only |
| `generate-training-block`     | [`trigger/generate-training-block.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-training-block.ts)         | `user-background` | On Demand    | Creates multi-week mesocycle training block outlines (Base, Build, Peak).              | Partial    | 🟠 Trigger.dev Only |
| `adapt-training-plan`         | [`trigger/adapt-training-plan.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/adapt-training-plan.ts)                 | `user-background` | On Demand    | Dynamically adjusts future plan workouts based on missed sessions or fatigue.          | Partial    | 🟠 Trigger.dev Only |
| `generate-structured-workout` | [`trigger/generate-structured-workout.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-structured-workout.ts) | `user-background` | On Demand    | Builds step-by-step target interval structures (% FTP/HR) for planned workouts.        | Partial    | 🟠 Trigger.dev Only |
| `adjust-structured-workout`   | [`trigger/adjust-structured-workout.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/adjust-structured-workout.ts)     | `user-background` | On Demand    | Modifies existing structured workout steps based on feedback or environmental factors. | Partial    | 🟠 Trigger.dev Only |
| `generate-ad-hoc-workout`     | [`trigger/generate-ad-hoc-workout.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-ad-hoc-workout.ts)         | `user-background` | On Demand    | Generates custom one-off workouts based on instant user prompts.                       | Partial    | 🟠 Trigger.dev Only |
| `generate-fueling-plan`       | [`trigger/generate-fueling-plan.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-fueling-plan.ts)             | `user-background` | On Demand    | Calculates per-hour carbohydrate and fluid fueling strategy for long sessions.         | Partial    | 🟠 Trigger.dev Only |
| `adjust-fueling-post-workout` | [`trigger/adjust-fueling-post-workout.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/adjust-fueling-post-workout.ts) | `user-background` | Post-Workout | Recommends post-session recovery macros based on actual expended energy.               | Partial    | 🟠 Trigger.dev Only |

---

### 4. Daily Coaching & Recommendations (7 Tasks)

| Task Identifier            | File Link                                                                                                               | Queue             | Schedule         | Capability / Purpose                                                                | Decoupled? | Migration Status    |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :---------------- | :--------------- | :---------------------------------------------------------------------------------- | :--------- | :------------------ |
| `daily-coach`              | [`trigger/daily-coach.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/daily-coach.ts)                           | `user-analysis`   | Cron / On Demand | Generates daily contextual advice accounting for timezones and recent load.         | Partial    | 🟠 Trigger.dev Only |
| `daily-checkin`            | [`trigger/daily-checkin.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/daily-checkin.ts)                       | `user-analysis`   | Morning          | Generates morning briefing combining readiness score, planned session, and weather. | Partial    | 🟠 Trigger.dev Only |
| `recommend-today-activity` | [`trigger/recommend-today-activity.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/recommend-today-activity.ts) | `user-analysis`   | On Demand        | Determines whether to proceed, modify, or swap today's planned activity.            | Partial    | 🟠 Trigger.dev Only |
| `recommend-nutrition-meal` | [`trigger/recommend-nutrition-meal.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/recommend-nutrition-meal.ts) | `user-analysis`   | Mealtime         | Recommends meal macronutrient targets tailored to upcoming training.                | Partial    | 🟠 Trigger.dev Only |
| `suggest-goals`            | [`trigger/suggest-goals.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/suggest-goals.ts)                       | `user-background` | On Demand        | Proposes short-term and long-term athletic goals based on history.                  | Partial    | 🟠 Trigger.dev Only |
| `review-goals`             | [`trigger/review-goals.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/review-goals.ts)                         | `user-background` | Periodic         | Evaluates goal progress and marks completed or stagnant objectives.                 | Partial    | 🟠 Trigger.dev Only |
| `generate-recommendations` | [`trigger/generate-recommendations.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-recommendations.ts) | `user-analysis`   | On Demand        | Updates holistic recommendation engine cards for dashboard view.                    | Partial    | 🟠 Trigger.dev Only |

---

### 5. Reporting, Chat & Communications (8 Tasks)

| Task Identifier                 | File Link                                                                                                                         | Queue             | Schedule           | Capability / Purpose                                                            | Decoupled?            | Migration Status                  |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------- | :---------------- | :----------------- | :------------------------------------------------------------------------------ | :-------------------- | :-------------------------------- |
| `generate-report`               | [`trigger/generate-report.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-report.ts)                             | `user-reports`    | On Demand          | Generates downloadable PDF/Markdown performance reports.                        | Partial               | 🟠 Trigger.dev Only               |
| `generate-custom-report`        | [`trigger/generate-custom-report.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-custom-report.ts)               | `user-reports`    | On Demand          | Generates custom query-driven analytics reports.                                | Partial               | 🟠 Trigger.dev Only               |
| `generate-weekly-report`        | [`trigger/generate-weekly-report.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-weekly-report.ts)               | `user-reports`    | Weekly             | End-of-week comprehensive training recap report.                                | Partial               | 🟠 Trigger.dev Only               |
| `send-email`                    | [`trigger/send-email.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/send-email.ts)                                       | `email-queue`     | On Demand          | Outbound transactional email delivery (Resend / SMTP).                          | Yes (`emailService`)  | 🟡 Service Decoupled              |
| `generate-workout-messages`     | [`trigger/generate-workout-messages.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-workout-messages.ts)         | `user-background` | Pre-Workout        | Generates motivational/coaching push notification messages before workouts.     | Partial               | 🟠 Trigger.dev Only               |
| `process-resend-webhook`        | [`trigger/process-resend-webhook.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/process-resend-webhook.ts)               | `email-queue`     | Webhook            | Processes Resend email bounce/delivery status webhooks.                         | Yes (`ResendService`) | 🟢 BullMQ Native (`webhookQueue`) |
| `trial-ending-reminder`         | [`trigger/trial-ending-reminder.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/trial-ending-reminder.ts)                 | `email-queue`     | Cron (`0 9 * * *`) | Sends automated email reminders when supporter/pro trial is ending.             | Yes (`ResendService`) | 🔵 Cron / Schedule                |
| `execute-chat-turn`             | [`trigger/execute-chat-turn.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/execute-chat-turn.ts)                         | `user-background` | On Demand          | Asynchronously executes multi-step LLM tool calls for background chat requests. | Yes (`turnRunner`)    | 🟡 Service Decoupled              |
| `summarize-chat`                | [`trigger/summarize-chat.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/summarize-chat.ts)                               | `user-background` | Post-Chat          | Summarizes long chat sessions for token window compression.                     | Partial               | 🟠 Trigger.dev Only               |
| `generate-implementation-guide` | [`trigger/generate-implementation-guide.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/generate-implementation-guide.ts) | `user-background` | On Demand          | Builds step-by-step guidance notes for executing complex workouts.              | Partial               | 🟠 Trigger.dev Only               |

---

### 6. System & Administrative (4 Tasks)

| Task Identifier       | File Link                                                                                                     | Queue             | Schedule     | Capability / Purpose                                                            | Decoupled?                     | Migration Status     |
| :-------------------- | :------------------------------------------------------------------------------------------------------------ | :---------------- | :----------- | :------------------------------------------------------------------------------ | :----------------------------- | :------------------- |
| `delete-user-account` | [`trigger/delete-user-account.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/delete-user-account.ts) | `user-background` | User Request | Purges all DB records, integration tokens, and files for user account deletion. | Yes (`accountDeletionService`) | 🟡 Service Decoupled |
| `process-sync-queue`  | [`trigger/process-sync-queue.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/process-sync-queue.ts)   | `user-ingestion`  | Periodic     | Retries stalled or failed sync operations.                                      | Partial                        | 🟠 Trigger.dev Only  |
| `hello-world`         | [`trigger/hello-world.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/hello-world.ts)                 | Default           | Debug        | Diagnostic ping task for verifying Trigger.dev connectivity.                    | N/A                            | 🟠 Trigger.dev Only  |
| `sentry-error-test`   | [`trigger/sentry-error-test.ts`](file:///Users/hdkiller/Develop/coach-wattz/trigger/sentry-error-test.ts)     | Default           | Debug        | Diagnostic task for testing error handling and Sentry alerts.                   | N/A                            | 🟠 Trigger.dev Only  |

---

## Migration Plan & Phasing

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Ingestion Tasks (23 Tasks)                                    │
│ Status: 95% Decoupled                                                   │
│ All provider sync tasks already invoke modular services in server/utils │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: System, Email & Chat Tasks (8 Tasks)                          │
│ Status: 80% Decoupled                                                   │
│ Account deletion, email sending, and chat execution call dedicated utils│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: AI Analysis & Planning Tasks (30 Tasks)                        │
│ Status: Target for Decoupling                                           │
│ Extract inline prompt construction out of trigger/*.ts into services    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Cron & Scheduled Jobs (4 Tasks)                                │
│ Register BullMQ repeatable jobs in cw:worker to replace schedules.task  │
└─────────────────────────────────────────────────────────────────────────┘
```
