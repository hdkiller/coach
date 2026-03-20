# Sentry Issue Tracking

This document tracks active, resolved, and investigated Sentry issues for Coach Watts.

## Recently Resolved

| Issue ID                                                               | Description                                                    | Status      | Resolution / Notes                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| [COACH-WATTS-ZT](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZT)   | `TypeError: Cannot read properties of undefined (reading 'p')` | ✅ Fixed    | Added defensive checks and automatic code block closure in `ChatMessageContent.vue`.                       |
| [COACH-WATTS-7A](https://newpush-y4.sentry.io/issues/COACH-WATTS-7A)   | `ReferenceError: session is not defined`                       | ✅ Fixed    | Refactored to use `event.context.session` populated by `requireAuth`.                                      |
| [COACH-WATTS-130](https://newpush-y4.sentry.io/issues/COACH-WATTS-130) | `TypeError: activities.value.filter is not a function`         | ✅ Fixed    | Added defensive `Array.isArray` checks to `activities` computed and its usage in `activities.vue`.         |
| [COACH-WATTS-ZH](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZH)   | `ReferenceError: timezone is not defined`                      | ✅ Fixed    | Renamed to `userTimezone`, fixed redeclaration, and ensured robust fetching in `trigger/daily-checkin.ts`. |
| [COACH-WATTS-10W](https://newpush-y4.sentry.io/issues/COACH-WATTS-10W) | `TypeError: i is not a function` in /workouts/:id              | ✅ Fixed    | Added defensive check for translation function `t` in `getWorkoutSourceLabel`.                             |
| [COACH-WATTS-5X](https://newpush-y4.sentry.io/issues/COACH-WATTS-5X)   | `Component WorkoutAnalysisReady not found`                     | ✅ Fixed    | Aligned imports with working templates and added safety guards for `recommendationHighlights`.             |
| [COACH-WATTS-Z7](https://newpush-y4.sentry.io/issues/COACH-WATTS-Z7)   | `ReferenceError: absPower is not defined`                      | ✅ Resolved | Code no longer exists; likely a side-effect of previous refactoring.                                       |

## Outstanding / Under Investigation

| Issue ID                                                               | Description                                              | Status           | Investigation Notes                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| [COACH-WATTS-12T](https://newpush-y4.sentry.io/issues/COACH-WATTS-12T) | `TypeError: Cannot destructure property 'bum' from null` | 🔍 Investigating | Vue internal `beforeUnmount` error. Component unmounting during async activity. |
| [COACH-WATTS-9](https://newpush-y4.sentry.io/issues/COACH-WATTS-9)     | `Importing a module script failed`                       | ⏳ Pending       | Standard Nuxt stale chunk issue. Needs global chunk-load failure handler.       |

## Maintenance Guidelines

- **Resolution**: Once a fix is committed, move the issue to the "Recently Resolved" table.
- **Verification**: Always verify resolution in Sentry after the next deployment.
- **New Issues**: Add critical or high-volume issues to the "Outstanding" table for tracking.
