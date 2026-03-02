# Workout Safety Layer Plan

## 1. Objective

Introduce a deterministic workout safety layer that sits between workout generation/editing and persistence so Coach Watts can:

1. Prevent unsafe load jumps and overly aggressive long runs.
2. Apply phase-aware safeguards for rebuilding athletes and less experienced runners.
3. Keep LLM flexibility for coaching language while removing LLM discretion over core safety constraints.
4. Make safety decisions explainable, auditable, and reusable across all planning entry points.

## 2. Why This Exists

Recent production behavior exposed a structural gap:

1. The system can generate or update planned workouts using valid sport-specific targets.
2. But there is no hard validation layer to reject workouts that are technically valid yet unsafe in progression context.
3. This allows plans that can overuse available time, ramp weekly load too fast, or skip deload logic without an explicit override path.

This plan addresses that gap.

## 3. Scope

In scope:

- Planned workout creation and update safety validation.
- Weekly plan and ad-hoc generation safety enforcement.
- Running-specific first-pass safety policies.
- Reusable safety service, DTOs, and logging.
- Explainable rejection, warning, and auto-adjust behavior.

Out of scope for phase 1:

- Full physiology/risk engine rewrite.
- UI redesign.
- Coach/admin override UX beyond backend support.
- Sport-specific safety policies for swim, gym, or cycling beyond generic low-risk checks.

## 4. Core Design Principles

1. Safety rules must be deterministic, not prompt-only.
2. The LLM may propose; the validator decides.
3. Rejections and auto-adjustments must be explainable in plain language.
4. The same safety logic must apply regardless of entry point.
5. Mixed readiness, limited training history, or recent breaks should tighten constraints, not loosen them.
6. Rules should be configurable and phased in conservatively.

## 5. Target Architecture

Create a server-owned safety module:

- `server/utils/training-safety/`
  - `types.ts`
  - `config.ts`
  - `history.ts`
  - `running-rules.ts`
  - `generic-rules.ts`
  - `service.ts`
  - `explanations.ts`
  - `index.ts`

Suggested output contract:

```ts
type WorkoutSafetyCheck = {
  allowed: boolean
  risk: 'low' | 'medium' | 'high'
  reasons: string[]
  warnings: string[]
  adjusted?: {
    durationSec?: number
    tss?: number
    descriptionNote?: string
  }
  ruleHits: string[]
}
```

## 6. Insertion Points

The safety layer should run after proposal generation but before persistence/sync in all of these paths:

1. `server/utils/ai-tools/planning.ts`
   - `create_planned_workout`
   - `update_planned_workout`
2. `trigger/generate-ad-hoc-workout.ts`
3. `trigger/generate-weekly-plan.ts`
4. `trigger/generate-structured-workout.ts`
   - only for sanity checks after structure-derived TSS/duration recalculation
5. Future training block generation if it directly writes workouts

Optional later:

6. recommendation acceptance endpoints
7. coach/admin tooling with override flags

## 7. Phase 1 Rule Set (Running First)

## A. Long Run Growth Caps

Rules:

1. Cap week-over-week long run duration increase.
   - Initial suggestion: `+15 min` default cap.
   - Optional higher cap only when athlete has a deep recent history and low risk score.
2. Cap long run share of weekly run volume.
   - Initial suggestion: no more than `30-35%` of weekly run duration in early build/rebuild.
3. Cap absolute long run duration by phase.
   - Example: no `3h` long run early in marathon rebuild.
4. Tighten caps after recent training breaks or sparse history.

Why:

- This directly addresses the production pattern where available time gets maximized into an oversized long run.

## B. Weekly Load Ramp Caps

Rules:

1. Compare proposed weekly run load against the trailing `2-4` weeks.
2. Reject or auto-scale if weekly TSS or duration increase exceeds configured ramp.
   - Initial suggestion: `8-12%` default cap.
3. Use completed workouts first; use planned workouts only for future remainder.
4. When TSS is missing or unreliable, use duration as fallback safety metric.

Why:

- This catches the common case where individual workouts look fine in isolation but the full week becomes risky.

## C. Deload Trigger Rules

Rules:

1. Detect `3-4` consecutive build weeks.
2. Detect high cumulative load jumps over the recent block.
3. Detect elevated fatigue indicators when available.
4. Flag the next week as deload-preferred or require a justification to continue building.

Phase 1 behavior:

1. Warn only in weekly generation.
2. Reject only the most aggressive build patterns.

Why:

- This addresses the situation where the system keeps building despite obvious accumulation.

## D. Session Sequencing Guardrails

Rules:

1. Prevent back-to-back hard run days without explicit recovery logic.
2. Prevent hard medium-long plus oversized long run stacking in the same short window.
3. Prevent threshold/VO2 placement too close to the long run unless explicitly justified.

Why:

- Unsafe load often comes from combinations, not just single workouts.

## E. Rebuild / Low-History Tightening

Rules:

1. If recent training history is sparse or the athlete recently resumed training, apply stricter caps.
2. Lower tolerance for long-run jumps and weekly ramp.
3. Prefer minimum effective dose when uncertainty is high.

Why:

- A return-from-break athlete should not be treated like a stable, fully built marathoner.

## 8. Safety Decision Modes

The service should support three modes:

1. `warn`
   - return warnings only
2. `adjust`
   - automatically scale duration/TSS to the nearest safe value
3. `block`
   - reject the proposal

Recommended phase-1 behavior:

1. `generate-weekly-plan`: `adjust`
2. `generate-ad-hoc-workout`: `adjust`
3. `create_planned_workout`: `warn` or `adjust`
4. `update_planned_workout`: `adjust` for AI-originated changes, `warn` for user-originated manual edits

## 9. Required Inputs

The safety layer should inspect:

1. Proposed workout
   - type
   - duration
   - TSS
   - intensity markers
2. Recent completed workouts
3. Recent planned workouts
4. Weekly aggregates
5. Athlete context
   - goal type
   - phase
   - recent break or rebuild status
   - experience proxies where available
6. Readiness/fatigue signals when available

## 10. Data Sources

Likely source files/services:

- `server/utils/repositories/workoutRepository.ts`
- `server/utils/repositories/plannedWorkoutRepository.ts`
- `server/utils/training-stress.ts`
- `server/utils/training-metrics.ts`
- training plan / block context from related repositories
- user profile and sport settings

## 11. Explainability Requirements

Every non-low-risk outcome should produce athlete- or developer-readable explanations such as:

1. "Proposed long run increases from 105 to 150 minutes (+45 min), exceeding the configured cap of +15 minutes."
2. "This week would raise run load by 29% versus the trailing 3-week average."
3. "Four consecutive build weeks detected without a deload signal."

This explanation should be available for:

1. logs
2. tool responses
3. future UI surfaces

## 12. Logging And Audit

Add structured logs for:

1. proposed vs final duration/TSS
2. risk level
3. triggered rules
4. adjustment reason
5. override usage when implemented

Potential future persistence:

- `PlannedWorkout.metadata.safety`
- separate audit table if needed later

## 13. Rollout Strategy

## Phase 0: Visibility Only

1. Compute safety check results.
2. Log outcomes.
3. Do not block writes yet.

Acceptance:

1. We can measure how often current generation would have triggered rules.

## Phase 1: Auto-Adjust Running Workouts

1. Enable automatic scaling for high-confidence running rules.
2. Keep hard blocks limited to obvious unsafe proposals.

Acceptance:

1. No oversized early-build long runs from AI-generated plans.
2. Weekly ramp outliers materially decrease.

## Phase 2: Broader Enforcement

1. Apply to more planning paths.
2. Add manual override support for trusted users/admins.
3. Expand sport-specific logic where justified.

## 14. Open Decisions

These need product/coach calibration before implementation:

1. What exact long-run growth cap should be default for runners?
2. Should weekly ramp be TSS-based, duration-based, or both?
3. What counts as a build week in this product?
4. When should user manual edits be blocked versus warned?
5. How should experience be modeled if there is no explicit athlete-experience field?
6. Should marathon-specific rules differ from general run-fitness rules?

## 15. Suggested First Implementation Slice

Implement only these in v1:

1. Long-run growth cap
2. Weekly run load ramp cap
3. Rebuild-state tightening
4. Structured explanation output
5. Logging

This is enough to address the observed production failure mode without overcommitting to a full safety engine.

## 16. Definition Of Done

Done for phase 1 when all are true:

1. AI-generated running plans cannot silently create oversized long-run jumps.
2. AI-generated running weeks cannot exceed configured ramp thresholds without adjustment or explicit override.
3. Safety decisions are logged and explainable.
4. The same service is called from the major planning entry points.
5. Contract tests cover rejection and adjustment behavior for known risky cases.
