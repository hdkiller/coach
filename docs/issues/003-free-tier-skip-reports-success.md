# 003 — Free-tier skip returns `success: true` → misleading toast

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `backend`, `workouts`  
**Status:** Open

## Description

When a free-tier user triggers structure generation for a workout more than 4 weeks in the future, the trigger task returns `{ success: true, skipped: true }`. The Planned Workout Details page treats any non-false success as a win and shows **"Structure Generated"**.

## Root Cause

Inside the trigger (defense in depth after API already checks):

```1041:1045:trigger/generate-structured-workout.ts
        return {
          success: true,
          skipped: true,
          message: 'Structured workout generation is limited to 4 weeks in advance for free users.'
        }
```

Frontend completion handler:

```1379:1406:app/pages/workouts/planned/[id]/index.vue
  onTaskCompleted('generate-structured-workout', async (run) => {
    ...
    if (output?.success === false) { ... return }

    toast.add({
      title: 'Structure Generated',
      description: 'Workout structure is ready.',
      ...
    })
  })
```

The handler never checks `output.skipped`.

Note: The API endpoint `generate-structure.post.ts` already returns 403 for this case at request time, so this bug mainly affects **nested triggers** (training block, ad-hoc, chat) that bypass the API guard or race with tier/date changes.

## Expected Behavior

- Skipped generation should show an informational or warning toast with the skip reason.
- Task output should use `success: false` with reason `SKIPPED` or the UI should explicitly handle `skipped: true`.

## Suggested Fix

Either:

- **Backend:** Return `{ success: false, skipped: true, reason: 'FREE_TIER_LIMIT' }`, or
- **Frontend:** Check `output?.skipped` and show appropriate messaging.

## Acceptance Criteria

- [ ] Skipped free-tier runs never show "Structure Generated"
- [ ] User sees clear upgrade/limit message
