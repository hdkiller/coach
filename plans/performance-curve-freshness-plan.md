# Performance Curve Freshness Plan

## Objective

Implement segment-level freshness for Power Duration Curve (PDC), Pace Duration Curve, and FTP context so users can distinguish real performance change from stale estimates.

## Why

- Avoid misinterpreting stale data as performance decline.
- Encourage periodic validation efforts across durations.
- Improve recommendation and workout-planning quality.

## Scope

- Power duration freshness states on chart segments.
- FTP evolution freshness context (fresh vs stale estimate conditions).
- Pace duration freshness for run users.
- Freshness-aware recommendation and planning prompts.

## Non-Goals (v1)

- Full physiology model recalibration.
- Heavy precomputation pipeline or warehouse dependency.
- Rewriting all charting components.

## Current Baseline (Code Touchpoints)

- Aggregate power curve endpoint is heuristic/placeholder:
  - `/Users/hdkiller/Develop/coach-wattz/server/api/workouts/power-curve.get.ts`
- Single-workout stream-based power curve exists:
  - `/Users/hdkiller/Develop/coach-wattz/server/api/workouts/[id]/power-curve.get.ts`
- FTP evolution endpoint exists:
  - `/Users/hdkiller/Develop/coach-wattz/server/api/performance/ftp-evolution.get.ts`
- Performance chart components:
  - `/Users/hdkiller/Develop/coach-wattz/app/components/PowerCurveChart.vue`
  - `/Users/hdkiller/Develop/coach-wattz/app/components/FTPEvolutionChart.vue`
- Recommendation/planning entry points:
  - `/Users/hdkiller/Develop/coach-wattz/trigger/recommend-today-activity.ts`
  - `/Users/hdkiller/Develop/coach-wattz/trigger/generate-recommendations.ts`
  - `/Users/hdkiller/Develop/coach-wattz/trigger/generate-weekly-plan.ts`

## Product Requirements

- Use one curve, but color segments by freshness.
- Freshness classes:
  - `fresh`: 0-30 days
  - `aging`: 31-90 days
  - `stale`: 91+ days
- Show tooltip details: last validating effort date and age in days.
- FTP chart indicates when estimate may be stale due to missing validating efforts.
- Daily guidance can suggest low-cost validation efforts.

## Data & Algorithm Design

- Duration grid (v1): `5,10,30,60,120,300,600,1200,1800,3600` seconds.
- For each duration bucket:
  - Compute reference best effort in lookback horizon (default 24 months).
  - Find most recent validating effort where value >= `validation_pct * reference_best`.
  - Compute `days_since_last_validating_effort`.
  - Map to freshness class.
- Default `validation_pct`: `0.97` (configurable).

## API Contract Changes (Additive)

- Extend aggregate power-curve response with per-duration metadata:
  - `duration`
  - `watts`
  - `bestDate`
  - `lastValidatingDate`
  - `daysSince`
  - `freshnessState`
- Extend FTP evolution response with:
  - `freshnessSummary`
  - optional per-point freshness flags for interpretation.
- Add pace-curve endpoint for run activity with equivalent metadata.

## Backend Work Breakdown

1. Create shared engine:
   - `/Users/hdkiller/Develop/coach-wattz/server/utils/performance/curve-freshness.ts`
2. Replace placeholder aggregate logic in:
   - `/Users/hdkiller/Develop/coach-wattz/server/api/workouts/power-curve.get.ts`
3. Add pace curve endpoint:
   - `/Users/hdkiller/Develop/coach-wattz/server/api/workouts/pace-curve.get.ts`
4. Extend FTP evolution endpoint:
   - `/Users/hdkiller/Develop/coach-wattz/server/api/performance/ftp-evolution.get.ts`
5. Add feature flags:
   - `curveFreshnessV1`, `paceCurveV1`, `ftpFreshnessV1`.

## Frontend Work Breakdown

1. Power curve segment coloring and freshness tooltip in:
   - `/Users/hdkiller/Develop/coach-wattz/app/components/PowerCurveChart.vue`
2. FTP stale-context UI in:
   - `/Users/hdkiller/Develop/coach-wattz/app/components/FTPEvolutionChart.vue`
3. Add pace curve card/chart and mount on performance page:
   - `/Users/hdkiller/Develop/coach-wattz/app/components/PaceCurveChart.vue`
   - `/Users/hdkiller/Develop/coach-wattz/app/components/performance/PerformancePaceCurveCard.vue`
   - `/Users/hdkiller/Develop/coach-wattz/app/pages/performance.vue`

## Recommendation/Planning Integration

- Inject freshness summary into recommendation context:
  - `/Users/hdkiller/Develop/coach-wattz/trigger/recommend-today-activity.ts`
  - `/Users/hdkiller/Develop/coach-wattz/trigger/generate-recommendations.ts`
- Planning guidance:
  - add guardrailed freshness-refresh suggestions in
    `/Users/hdkiller/Develop/coach-wattz/trigger/generate-weekly-plan.ts`
  - keep base intent intact while inserting minimal validation stimuli.

## Testing Strategy

- Unit tests for freshness classification and recency math:
  - `/Users/hdkiller/Develop/coach-wattz/server/utils/performance/curve-freshness.test.ts`
- API contract tests for additive fields and null-data behavior.
- UI tests for segment colors, tooltip text, and stale banners.
- Prompt-level regression checks to prevent excessive hard-session prescriptions.

## Rollout Plan

1. Phase 1: Backend engine + hidden API fields under flag.
2. Phase 2: Power curve UI freshness.
3. Phase 3: FTP freshness context.
4. Phase 4: Recommendation/planning integration.
5. Phase 5: Pace duration curve.

## Metrics

- Percentage of users with at least one stale duration segment.
- Time to refresh stale segment after first warning.
- Acceptance rate of freshness-driven recommendations.
- Rate of users reporting stale-FTP confusion.

## Risks and Mitigations

- Sparse or irregular streams can produce noisy estimates.
  - Mitigation: enforce minimum sample quality checks.
- Over-prescription of validation efforts.
  - Mitigation: apply readiness and frequency caps.
- User confusion around stale vs decline.
  - Mitigation: explicit labels and educational tooltips.

## Exit Criteria

- Freshness states visible and accurate on power curve for flagged users.
- FTP chart can explicitly classify likely stale estimate scenarios.
- Recommendation pipeline uses freshness context in daily suggestions.
- Pace-duration freshness available for run activity in performance page.
