# Sentry Issue Tracking

This document tracks active, resolved, and investigated Sentry issues for Coach Watts.

## Recently Resolved

| Issue ID                                                               | Description                                                         | Status      | Resolution / Notes                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [COACH-WATTS-15P](https://newpush-y4.sentry.io/issues/COACH-WATTS-15P) | `SyntaxError: Failed to execute 'addColorStop' on 'CanvasGradient'` | ✅ Fixed    | Fixed invalid color string construction (`rgba(...)08`) in `ChartRenderer.vue` and `BaseWidget.vue` using `withOpacity` helper.      |
| [COACH-WATTS-15E](https://newpush-y4.sentry.io/issues/COACH-WATTS-15E) | `PrismaClientValidationError: Unknown field featureFlags`           | ✅ Fixed    | Ran `npx prisma generate` to sync the generated client with `schema.prisma` which recently added `featureFlags` to the `User` model. |
| [COACH-WATTS-12T](https://newpush-y4.sentry.io/issues/COACH-WATTS-12T) | `TypeError: Cannot destructure property 'bum' from null`            | ✅ Fixed    | Unregistered `useAnalyticsBus` listeners on unmount in multiple components to prevent null-pointer errors during navigation.         |
| [COACH-WATTS-1P](https://newpush-y4.sentry.io/issues/COACH-WATTS-1P)   | `TypeError: Cannot read properties of null (reading 'parentNode')`  | ✅ Fixed    | Same as 12T; fixed leaking event listeners in `workout-explorer.vue` and `ChartRenderer.vue`.                                        |
| [COACH-WATTS-9](https://newpush-y4.sentry.io/issues/COACH-WATTS-9)     | `Importing a module script failed`                                  | ✅ Handled  | Verified that `app/plugins/chunk-error.client.ts` already handles this via automatic page reload.                                    |
| [COACH-WATTS-ZT](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZT)   | `TypeError: Cannot read properties of undefined (reading 'p')`      | ✅ Fixed    | Added defensive checks and automatic code block closure in `ChatMessageContent.vue`.                                                 |
| [COACH-WATTS-7A](https://newpush-y4.sentry.io/issues/COACH-WATTS-7A)   | `ReferenceError: session is not defined`                            | ✅ Fixed    | Refactored to use `event.context.session` populated by `requireAuth`.                                                                |
| [COACH-WATTS-130](https://newpush-y4.sentry.io/issues/COACH-WATTS-130) | `TypeError: activities.value.filter is not a function`              | ✅ Fixed    | Added defensive `Array.isArray` checks to `activities` computed and its usage in `activities.vue`.                                   |
| [COACH-WATTS-ZH](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZH)   | `ReferenceError: timezone is not defined`                           | ✅ Fixed    | Renamed to `userTimezone`, fixed redeclaration, and ensured robust fetching in `trigger/daily-checkin.ts`.                           |
| [COACH-WATTS-10W](https://newpush-y4.sentry.io/issues/COACH-WATTS-10W) | `TypeError: i is not a function` in /workouts/:id                   | ✅ Fixed    | Added defensive check for translation function `t` in `getWorkoutSourceLabel`.                                                       |
| [COACH-WATTS-5X](https://newpush-y4.sentry.io/issues/COACH-WATTS-5X)   | `Component WorkoutAnalysisReady not found`                          | ✅ Fixed    | Aligned imports with working templates and added safety guards for `recommendationHighlights`.                                       |
| [COACH-WATTS-Z7](https://newpush-y4.sentry.io/issues/COACH-WATTS-Z7)   | `ReferenceError: absPower is not defined`                           | ✅ Resolved | Code no longer exists; likely a side-effect of previous refactoring.                                                                 |

## Outstanding / Under Investigation

| Issue ID                                                               | Description                                             | Status           | Investigation Notes                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| [COACH-WATTS-117](https://newpush-y4.sentry.io/issues/COACH-WATTS-117) | `Object Not Found Matching Id:3, MethodName:update`     | 🔍 Investigating | Cryptic unhandled promise rejection. Potentially from a 3rd party library or browser extension.                |
| [COACH-WATTS-5X](https://newpush-y4.sentry.io/issues/COACH-WATTS-5X)   | `Error: Garmin client ID not configured`                | 🛠️ Configuration | Occurring in development/preview environments. Need to ensure `GARMIN_CLIENT_ID` is set or gracefully handled. |
| COACH-WATTS-D/C/9                                                      | Dynamic Import / Chunk Load Errors                      | ℹ️ Known         | Caused by deployments deleting old assets. `chunk-error.client.ts` plugin handles this with reloads.           |
| [COACH-WATTS-MP](https://newpush-y4.sentry.io/issues/COACH-WATTS-MP)   | `Invalid call to runtime.sendMessage(). Tab not found.` | 🔍 Investigating | Likely browser extension noise leaking into Sentry.                                                            |

## Maintenance Guidelines

- **Resolution**: Once a fix is committed, move the issue to the "Recently Resolved" table.
- **Verification**: Always verify resolution in Sentry after the next deployment.
- **New Issues**: Add critical or high-volume issues to the "Outstanding" table for tracking.
