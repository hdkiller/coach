# Sentry Issues Resolution Plan (April 8, 2026)

## Objective

Identify and resolve outstanding Sentry issues that were first seen before today (April 8, 2026) but are still occurring.

## Key Outstanding Issues

### 1. COACH-WATTS-18B: TypeError in Advanced Metrics

- **Symptom**: `TypeError: null is not an object (evaluating '...advanced.decoupling.toFixed')`
- **Location**: `app/components/AdvancedWorkoutMetrics.vue`
- **Cause**: The `click` handler for Aerobic Decoupling (and potentially other metrics) calls `toFixed(1)` on a `null` value without checking first.
- **Fix**: Add defensive null checks to all metrics using `toFixed(1)` in both click handlers and display sections.

### 2. COACH-WATTS-16B: Ultrahuman Token Refresh Failure

- **Symptom**: `Failed to refresh Ultrahuman token: 400 Bad Request`
- **Location**: `server/utils/ultrahuman.ts` (triggered by `poll-ultrahuman` task)
- **Cause**: Likely a single user (or small group) has a revoked or invalid refresh token, causing the periodic poller to fail.
- **Fix**: Improve error handling in `refreshUltrahumanToken` to catch 400 errors and update the `integration`'s `syncStatus` to 'FAILED' with a clear message, effectively disabling polling for that user until re-authenticated.

### 3. COACH-WATTS-118: Prisma Error in ChatTurnService

- **Symptom**: `PrismaClientKnownRequestError: ` (Empty message in Sentry)
- **Location**: `server/utils/services/chatTurnService.ts` in `claimNextQueuedTurn`
- **Cause**: Likely a transient connection pool issue or database lock during high-frequency polling (every 250ms).
- **Fix**: Add a `try...catch` wrapper inside the `claimNextQueuedTurn` loop to log the specific error code and potentially add a small jittered backoff on failure.

### 4. COACH-WATTS-3J: Unhandled Rejection in Workout Detail

- **Symptom**: `UnhandledRejection: Non-Error promise rejection captured with value: undefined`
- **Location**: `app/pages/workouts/[id]/index.vue`
- **Cause**: Likely a component or a fetch call inside the massive workout page is rejecting with `undefined`.
- **Fix**: Add a global error handler or more robust `try...catch` blocks to the page and its sub-components. Specifically, ensure that all `$fetch` calls have proper error handling and that we don't call methods on potentially null data (like `workout.value`).

### 5. COACH-WATTS-1P, 5X, ZT: Potentially Resolved

- **Status**: These were marked as fixed in `SENTRY-ISSUES.md` but were seen 5-7 days ago in Sentry.
- **Action**: Mark as resolved in Sentry to verify if they stay quiet.

## Implementation Steps

### Phase 1: Frontend Fixes (COACH-WATTS-18B)

- [ ] Update `app/components/AdvancedWorkoutMetrics.vue` click handlers for Decoupling, Fatigue, and Coasting to use safe formatting.
- [ ] Review other metrics in the same component for potential null pointer errors.

### Phase 2: Integration Robustness (COACH-WATTS-16B, 6Z, YD)

- [ ] Refactor `refreshUltrahumanToken` in `server/utils/ultrahuman.ts` to handle 400 errors gracefully.
- [ ] Apply similar logic to Withings and Whoop refresh functions if they exhibit the same pattern.

### Phase 3: Backend Stability (COACH-WATTS-118)

- [ ] Wrap `claimNextQueuedTurn` inner logic in a `try...catch`.
- [ ] Log specific Prisma error codes to aid future debugging.
- [ ] Update `SENTRY-ISSUES.md` to reflect these changes.

## Verification

- [ ] Monitor Sentry for new occurrences of these issues.
- [ ] Trigger manual test of `poll-ultrahuman` via CLI to ensure broken tokens don't spam Sentry.
