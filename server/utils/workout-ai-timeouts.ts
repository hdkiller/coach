/**
 * Shared AI timeout policy for workout-related Trigger.dev tasks.
 * Structure generation uses up to 2 attempts (Flash → Pro); each attempt is bounded here.
 * Trigger task maxDuration remains 180s for generate/adjust structure tasks.
 */
export const WORKOUT_STRUCTURE_AI_TIMEOUT_MS = 45_000

export const WORKOUT_STRUCTURE_AI_MAX_RETRIES = 0

/**
 * Single source of truth for the Trigger.dev `maxDuration` shared by
 * `generate-structured-workout` and `adjust-structured-workout`. Both tasks also use this
 * value (in ms) internally to compute/log remaining budget — keep it here instead of duplicating
 * the literal in each trigger file.
 */
export const STRUCTURE_GENERATION_TASK_MAX_DURATION_SEC = 180
export const STRUCTURE_GENERATION_TASK_MAX_DURATION_MS =
  STRUCTURE_GENERATION_TASK_MAX_DURATION_SEC * 1000

/**
 * When Trigger.dev kills a run for exceeding `maxDuration`, the task's `cleanup`/`onSuccess`/
 * `onFailure` lifecycle hooks do NOT run (see Trigger.dev docs: "maxDuration and lifecycle
 * functions"). That means the in-task try/catch/finally around `WorkoutStructureGenerationRun`
 * bookkeeping never executes either, so a hard timeout can leave the run row stuck in
 * PENDING/RUNNING forever — which in turn wedges the UI's "still generating" gate and the chat
 * tool's in-flight guard indefinitely.
 *
 * `hasActiveStructureGenerationRun()` self-heals this: any PENDING/RUNNING row older than this
 * threshold is treated as failed (and reconciled to FAILED in the DB) the next time it's read.
 * Padded above the task's own maxDuration to leave headroom for queueing/startup latency before
 * an attempt actually begins executing.
 */
export const STRUCTURE_GENERATION_RUN_STALE_AFTER_MS =
  STRUCTURE_GENERATION_TASK_MAX_DURATION_MS + 60_000
