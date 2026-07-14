# 261 — Strength library matching can fail the whole trigger task

**Priority:** High  
**Type:** Bug/Performance  
**Status:** Open

## Summary

Strength post-processing performs per-exercise library matching (including LLM-based matching) that can:

- Execute **serially** for many steps.
- Use long per-call timeouts.
- Throw errors that are **not isolated** from the main generation attempt.

As a result, a transient LLM/network error during matching can fail the entire Trigger.dev task even after a valid structure was generated.

## Impact

- Higher retry rates and wasted quota: successful structures discarded due to matching failures.
- Increased risk of exceeding Trigger `maxDuration` due to serial matching calls.

## Likely fix

- Treat matching as best-effort enrichment:
  - apply a **time budget** / cap per task,
  - optionally parallelize bounded work,
  - wrap matching in `try/catch` so failures degrade gracefully and don’t fail the task.

## References

- `server/utils/strength-exercise-matching.ts` — LLM matching with long timeout; broad candidate triggering
- `trigger/generate-structured-workout.ts` — matching performed outside the per-attempt try/catch
