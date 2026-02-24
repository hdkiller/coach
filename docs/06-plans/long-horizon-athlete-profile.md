# Long-Horizon Athlete Profile Architecture Plan

## 1. Objective

Build a persistent, low-token athlete profiling system that captures long-term training behavior (months), while still reacting to short-term changes (days/weeks).

Primary goals:

- Reduce LLM token usage by avoiding full-profile regeneration from raw history on every refresh.
- Improve plan quality by explicitly modeling long-term patterns (response to load, consistency, event prep behavior).
- Keep recency sensitivity via a lightweight short-horizon delta layer.

## 2. Current State (Baseline)

Today, `generate-athlete-profile` composes one profile mostly from recent data windows (primarily ~30 days, plus some 7-day slices) and persists it as `Report(type='ATHLETE_PROFILE')`.

Implications:

- The profile is useful for recent context but weak on multi-month trends.
- The model repeatedly sees similar historical context, increasing token spend.
- No explicit distinction between stable long-term traits vs short-term readiness shifts.

## 3. Target Architecture

Introduce three profile layers:

1. `ATHLETE_PROFILE_BASE`

- Long-horizon model (6-12 months).
- Encodes durable characteristics and trend summaries.
- Regenerated infrequently (e.g., monthly) or on major context changes.

2. `ATHLETE_PROFILE_DELTA`

- Short-horizon model (7-14 days).
- Encodes acute deviations (fatigue spikes, schedule disruptions, rapid fitness changes).
- Regenerated frequently with new incoming data.

3. `ATHLETE_PROFILE_EFFECTIVE`

- Merged profile consumed by planning/recommendation/chat.
- Produced deterministically from BASE + DELTA + small rule layer (or tiny LLM merge call if needed).
- Persisted so downstream tasks do not repeat merge work.

## 4. What Goes Into Long Horizon (`BASE`)

Include only durable signals and trend summaries:

1. Load and progression trends

- Weekly/monthly TSS trajectories, ramp rates, deload cadence.
- CTL/ATL/TSB trend summaries over meso/macro windows.

2. Intensity and zone behavior

- Long-term distribution by intensity buckets.
- HR/power zone usage by sport and over time.

3. Sport-specific phenotype

- Per-sport volume split, threshold progression (FTP/LTHR/MaxHR evolution), and preferred metric reliability.

4. Consistency and adherence behavior

- Planned vs completed trends, missed-key-session patterns, streaks, weekday failure hotspots.

5. Recovery signatures

- Baseline ranges and drift for HRV/resting HR/sleep.
- Typical recovery lag after high-load weeks.

6. Goal and event execution history

- Preparation patterns before events, taper response, post-event recovery behavior.

7. Constraint memory

- Durable availability constraints and modality preferences.

Exclude from BASE:

- Day-level tactical guidance.
- Last-workout tactical notes.
- Same-day readiness advice.

## 5. Data and Persistence Strategy

## 5.1 Storage

Reuse `Report` with string `type` values:

- `ATHLETE_PROFILE_BASE`
- `ATHLETE_PROFILE_DELTA`
- `ATHLETE_PROFILE_EFFECTIVE`

Store:

- `analysisJson`: structured profile layer payload.
- `dateRangeStart`/`dateRangeEnd`: exact horizon coverage.
- `modelVersion`: generation model metadata.

No new table is required for v1.

## 5.2 Input Fingerprinting

Add deterministic fingerprinting to skip unnecessary regeneration:

- Compute an input hash from:
  - rollup summaries (load, intensity, recovery, adherence)
  - active goals snapshot
  - sport settings snapshot
  - user context fields relevant to coaching
- Persist hash in `analysisJson.meta.inputFingerprint` (or a dedicated metadata field if added later).
- If hash unchanged, skip LLM generation for that layer.

## 5.3 Deterministic Rollups

Before any LLM call, compute rollups in code from raw data:

- Weekly/monthly aggregates
- Trend deltas
- Distribution stats
- Adherence ratios

Only pass rollups and compact examples to LLM, not raw long history.

## 6. Generation and Merge Flow

1. Ingest event (or scheduled refresh) occurs.
2. Refresh DELTA if short-horizon fingerprint changed.
3. Refresh BASE only if:

- stale beyond policy (e.g., 30 days), or
- major change detected (goals/settings/context shift), or
- explicitly forced by user/admin.

4. Build EFFECTIVE profile:

- Prefer deterministic merge rules:
  - durable fields from BASE
  - recency overrides from DELTA
  - confidence weighting by freshness and data completeness
- Persist EFFECTIVE.

5. Downstream systems (`generate-weekly-plan`, `recommend-today-activity`, goal review, etc.) read EFFECTIVE first, with fallback to legacy `ATHLETE_PROFILE` during migration.

## 7. Trigger and Scheduling Policy

1. Event-driven

- After successful ingest of workouts/wellness/nutrition/check-ins.
- Debounce per user to avoid repeated runs in sync bursts.

2. Time-driven

- Nightly/weekly audit to ensure BASE freshness and backfill missed events.

3. Freshness defaults (initial)

- DELTA TTL: 24 hours.
- BASE TTL: 30 days.
- EFFECTIVE TTL: tied to DELTA updates.

## 8. Schema Contract (High-Level)

Each profile JSON should include:

- `meta`: `version`, `generatedAt`, `dateRange`, `inputFingerprint`, `confidence`.
- `training_characteristics_long_term` (BASE-heavy).
- `current_state_delta` (DELTA-heavy).
- `planning_context_effective` (merged output).
- `evidence`: minimal references to aggregated metrics used for decisions.

Version the schema (`meta.version`) to allow non-breaking evolution.

## 8.1 Concrete JSON Contract (v1)

All layered profiles use a shared envelope and layer-specific payload fields.

```json
{
  "meta": {
    "version": "1.0.0",
    "layer": "BASE|DELTA|EFFECTIVE",
    "generatedAt": "2026-02-24T12:00:00.000Z",
    "dateRange": {
      "start": "2025-08-24T00:00:00.000Z",
      "end": "2026-02-24T23:59:59.999Z"
    },
    "inputFingerprint": "sha256:...",
    "freshUntil": "2026-03-24T12:00:00.000Z",
    "confidence": 0.82,
    "sources": {
      "workouts": 188,
      "wellness": 142,
      "nutrition": 57,
      "checkins": 31
    }
  },
  "summary": {
    "executive": "string",
    "primaryFocus": "string",
    "keyRisks": ["string"],
    "keyOpportunities": ["string"]
  },
  "evidence": {
    "metrics": {
      "weeklyTssAvg": 0,
      "ctlTrend": "increasing|stable|decreasing|unknown",
      "adherenceRate": 0
    },
    "notes": ["string"]
  }
}
```

### 8.1.1 `ATHLETE_PROFILE_BASE` payload

```json
{
  "training_characteristics_long_term": {
    "athleteType": "string",
    "responsePatterns": ["string"],
    "limiters": ["string"],
    "durableStrengths": ["string"]
  },
  "load_profile": {
    "weeklyTss": {
      "avg": 0,
      "p10": 0,
      "p90": 0
    },
    "rampRatePerWeek": {
      "avg": 0,
      "safeCeiling": 0
    },
    "deloadCadenceWeeks": 0
  },
  "intensity_profile": {
    "distributionPct": {
      "recovery": 0,
      "endurance": 0,
      "tempo": 0,
      "threshold": 0,
      "vo2max": 0
    },
    "zoneFeasibilityFlags": ["string"]
  },
  "sport_profiles": [
    {
      "name": "Cycling",
      "types": ["Ride", "VirtualRide"],
      "thresholdHistory": {
        "ftpStart": 0,
        "ftpCurrent": 0,
        "lthrStart": 0,
        "lthrCurrent": 0
      },
      "zoneUsageSummary": "string"
    }
  ],
  "adherence_profile": {
    "plannedVsCompletedRate": 0,
    "missedKeyWorkoutRate": 0,
    "failureHotspots": ["Mon evening", "Thu morning"]
  },
  "recovery_baseline": {
    "hrvRmssd": {
      "baseline": 0,
      "typicalRange": [0, 0]
    },
    "restingHr": {
      "baseline": 0,
      "typicalRange": [0, 0]
    },
    "sleepHours": {
      "baseline": 0,
      "typicalRange": [0, 0]
    },
    "recoveryLagDaysAfterHardBlock": 0
  },
  "goal_history": {
    "eventPrepPatterns": ["string"],
    "taperResponse": "positive|neutral|negative|unknown"
  }
}
```

### 8.1.2 `ATHLETE_PROFILE_DELTA` payload

```json
{
  "current_state_delta": {
    "readinessState": "low|moderate|high|unknown",
    "acuteLoadState": "underloaded|balanced|overreaching|unknown",
    "recentDisruptions": ["travel", "poor sleep"],
    "riskFlags": ["elevated-resting-hr", "hrv-drop-3d"],
    "positiveSignals": ["good-adherence-7d"]
  },
  "last14d_metrics": {
    "weeklyTssEquivalent": 0,
    "adherenceRate": 0,
    "avgRecoveryScore": 0,
    "latestHrvRmssd": 0,
    "latestRestingHr": 0
  },
  "delta_recommendations": {
    "next7dVolumeAdjustmentPct": 0,
    "intensityAdjustment": "reduce|hold|increase",
    "prioritySessionTypes": ["endurance", "threshold"],
    "recoveryActions": ["sleep +30m", "reduce back-to-back hard days"]
  }
}
```

### 8.1.3 `ATHLETE_PROFILE_EFFECTIVE` payload

```json
{
  "planning_context_effective": {
    "focus": "string",
    "constraints": ["string"],
    "guardrails": {
      "weeklyTssMin": 0,
      "weeklyTssMax": 0,
      "maxRampPct": 0,
      "hardDaysPerWeekMax": 0
    },
    "intensityTargetsPct": {
      "recovery": 0,
      "endurance": 0,
      "tempo": 0,
      "threshold": 0,
      "vo2max": 0
    },
    "sportPriority": ["Ride", "Run", "Gym"]
  },
  "merged_reasoning": {
    "baseDrivers": ["string"],
    "deltaOverrides": ["string"],
    "confidenceNotes": ["string"]
  },
  "prompt_shortcuts": {
    "weeklyPlanSnippet": "string",
    "dailyCoachSnippet": "string",
    "goalReviewSnippet": "string"
  }
}
```

## 8.2 Layer-Specific TTL / Freshness Rules (v1)

- `BASE`: `freshUntil = generatedAt + 30 days`
- `DELTA`: `freshUntil = generatedAt + 24 hours`
- `EFFECTIVE`: `freshUntil = min(BASE.freshUntil, DELTA.freshUntil)` with immediate invalidation if DELTA refreshes

## 8.3 Backward Compatibility with Existing `ATHLETE_PROFILE`

During migration, maintain dual-read fallback:

1. Read latest `ATHLETE_PROFILE_EFFECTIVE` if fresh.
2. Else read latest legacy `ATHLETE_PROFILE`.
3. Else fallback to basic user/sport settings context.

Compatibility mapping for current consumers:

- `current_fitness.status_label` <- derived from `planning_context_effective.focus` + readiness.
- `training_characteristics.strengths` <- `training_characteristics_long_term.durableStrengths`.
- `planning_context.current_focus` <- `planning_context_effective.focus`.
- `planning_context.limitations` <- `planning_context_effective.constraints`.
- `recommendations_summary.action_items` <- merge of `delta_recommendations` and guardrail actions.

## 8.4 Suggested Runtime Validators

Implement layer validators in code (Zod or JSON schema) before persistence:

- `AthleteProfileBaseV1Schema`
- `AthleteProfileDeltaV1Schema`
- `AthleteProfileEffectiveV1Schema`

Validation requirements:

- `meta.version`, `meta.layer`, `meta.inputFingerprint` mandatory.
- confidence in `[0,1]`.
- all percentage fields bounded to `[0,100]`.
- `weeklyTssMin <= weeklyTssMax`.

## 9. Token and Cost Optimization Rules

1. Deterministic-first policy

- Use code-derived metrics wherever possible.
- LLM is for synthesis/interpretation, not arithmetic.

2. Layered prompts

- BASE prompt gets monthly/weekly rollups only.
- DELTA prompt gets short-window summaries only.
- EFFECTIVE merge should be deterministic by default.

3. Strict skip conditions

- No LLM call if fingerprint unchanged and TTL valid.

4. Compact context

- Cap examples to top-N representative sessions and anomalies.

## 10. Migration Plan

## Phase 0: Design and Contract

- [ ] Define JSON contracts for BASE/DELTA/EFFECTIVE.
- [ ] Add compatibility mapping from legacy `ATHLETE_PROFILE` fields.

## Phase 1: Rollups + Fingerprinting

- [ ] Implement reusable rollup builder utilities.
- [ ] Implement fingerprint generation.
- [ ] Add debug logging for skip/run decisions.

## Phase 2: BASE and DELTA Generators

- [ ] Add `generate-athlete-profile-base` task.
- [ ] Add `generate-athlete-profile-delta` task.
- [ ] Persist outputs as Report rows with new types.

## Phase 3: EFFECTIVE Merge + Read Path

- [ ] Implement deterministic merge function.
- [ ] Add `ATHLETE_PROFILE_EFFECTIVE` persistence.
- [ ] Update read paths in planning/recommendation to prefer EFFECTIVE.

## Phase 4: Trigger Wiring

- [ ] Wire ingest and scheduled refresh triggers.
- [ ] Add per-user debounce/coalescing.

## Phase 5: Observability and Guardrails

- [ ] Add metrics: token usage, skip rate, profile freshness, generation latency.
- [ ] Add failure fallback to last known EFFECTIVE profile.

## Phase 6: Legacy Transition

- [ ] Keep existing `ATHLETE_PROFILE` as fallback during rollout.
- [ ] After stable period, deprecate direct single-profile generation path.

## 11. Risks and Mitigations

1. Drift between BASE and DELTA semantics

- Mitigation: strict schema ownership and deterministic merge precedence.

2. Over-skipping updates due to weak fingerprints

- Mitigation: include freshness gates + manual force refresh + anomaly triggers.

3. Increased complexity in pipeline orchestration

- Mitigation: phased rollout with fallbacks and clear per-layer ownership.

4. Inconsistent downstream field expectations

- Mitigation: compatibility adapter for old consumers until fully migrated.

## 12. Success Criteria

- > =50% reduction in athlete-profile generation token usage per active user.
- > =70% of refresh attempts skipped safely due to unchanged fingerprints.
- No regression in weekly plan quality metrics (adherence, user edits, satisfaction proxies).
- Profile freshness SLO met (DELTA <24h, BASE <30d for active users).

## 13. Programmatic Feature Extraction for Prompt Building

This section defines what we should compute in code before any LLM call.

Principle:

- Deterministic metrics first, LLM synthesis second.
- Use fixed feature builders for repeatability and lower token usage.

## 13.1 Load and Volume Features

Features:

- `totalTSS_7d`, `totalTSS_28d`, `totalTSS_84d`
- `weeklyTSSAvg_28d`, `weeklyTSSAvg_84d`
- `durationHours_7d/28d/84d`
- `distanceKm_7d/28d/84d`
- `rampRatePct_weekOverWeek`
- `hardSessionsPerWeek`, `longSessionFrequency`

Primary sources:

- `Workout`: `date`, `tss`, `trimp`, `durationSec`, `distanceMeters`, `type`, `isDuplicate`

Prompt usage:

- Weekly volume targets, overload caps, and progression guardrails.

## 13.2 Intensity and Zone Distribution Features

Features:

- Time distribution by IF buckets:
  - recovery `<0.70`
  - endurance `0.70-0.85`
  - tempo `0.85-0.95`
  - threshold `0.95-1.05`
  - vo2 `>1.05`
- `powerZonePct_*`, `hrZonePct_*` (per window and per sport where possible)
- `hrPowerAlignmentIndex` (agreement/disagreement between HR and power distributions)

Primary sources:

- `Workout`: `intensity`, `tss`, `durationSec`, `type`
- `WorkoutStream`: `hrZoneTimes`, `powerZoneTimes`, `heartrate`, `watts`
- `SportSettings`: zone definitions per profile

Prompt usage:

- Intensity distribution instructions and zone-feasibility warnings.

## 13.3 Fitness/Fatigue State Features

Features:

- `currentCTL`, `currentATL`, `currentTSB`
- `ctlTrend_28d` (increasing/stable/decreasing)
- `tsbRiskFlag` (e.g., sustained deep negative TSB)
- `loadVolatilityScore` (week-to-week instability)

Primary sources:

- `Workout`: `ctl`, `atl`, `date`
- `Wellness`: `ctl`, `atl`, `date`

Prompt usage:

- Recovery gating and fatigue-aware scheduling decisions.

## 13.4 Adherence and Consistency Features

Features:

- `plannedCompletionRate_28d`
- `missedKeyWorkoutRate_28d`
- `trainingDaysPerWeekAvg`
- `streakLongestDays_84d`
- `weekdayComplianceProfile` (e.g., Tue/Thu high success)

Primary sources:

- `PlannedWorkout`: `date`, `completed`, `completionStatus`, `tss`, `type`, `title`
- Completed workout linkage fields/relations

Prompt usage:

- Realistic scheduling, key-session placement, and compliance-aware plan shaping.

## 13.5 Sport-Specific Features

Features:

- `volumeBySportPct`
- `tssBySportPct`
- `thresholdProgressionBySport` (FTP/LTHR deltas across horizon)
- `zoneUsageBySport`
- `metricReliabilityBySport` (HR vs power data availability/quality)

Primary sources:

- `Workout.type`
- `SportSettings`: `ftp`, `lthr`, `maxHr`, `types`, `loadPreference`, `hrZones`, `powerZones`

Prompt usage:

- Sport-priority sequencing and threshold-specific workout targeting.

## 13.6 Recovery and Wellness Features

Features:

- `hrvBaseline`, `hrvTrend_14d`, `hrvDropStreakDays`
- `restingHrBaseline`, `restingHrTrend_14d`
- `sleepBaselineHours`, `sleepTrend_14d`
- `recoveryScoreAvg_7d/28d`
- `recoveryLagAfterHardBlockDays`

Primary sources:

- `Wellness`: `hrv`, `hrvSdnn`, `restingHr`, `sleepHours`, `recoveryScore`, `date`
- Optional: daily check-ins for subjective corroboration

Prompt usage:

- Acute readiness adjustments and recovery action recommendations.

## 13.7 Performance Response Features

Features:

- `stimulusResponseMap`:
  - how athlete responds to threshold-heavy weeks
  - how athlete responds to VO2-heavy weeks
  - response lag estimates
- `plateauFlag` (load increasing while fitness markers stall)
- `durabilitySignal` (late-session fade frequency)

Primary sources:

- Workout history + training context trends
- `Workout.aiAnalysisJson` summary signals where available

Prompt usage:

- Choosing the next best training stimulus and avoiding repeated ineffective patterns.

## 13.8 Goal/Event Readiness Features

Features:

- `daysToEvent`, `daysToTarget`
- `goalSpecificReadinessScore` (rule-based composite)
- `taperReadinessFlag`
- `goalFeasibilityBand` (on-track / at-risk / off-track)

Primary sources:

- `Goal`: target/event fields and context
- Combined load/recovery/intensity/adherence features

Prompt usage:

- Phase selection, specificity, and taper/peak decisions.

## 13.9 Constraint and Behavior Memory Features

Features:

- `declaredAvailabilityProfile`
- `observedTrainabilityProfile` (actual trained slots)
- `sessionDurationTolerance` (median/95p tolerated duration by weekday)
- `modalityPreferenceScore` (Ride/Run/Gym preference inferred from history)

Primary sources:

- Availability repository output
- Timestamped workout history

Prompt usage:

- Practical schedule construction and realistic session durations.

## 13.10 Data Quality and Confidence Features

Features:

- `coverage.workout/wellness/nutrition/checkin`
- `freshnessDaysBySource`
- `missingCriticalMetricsFlags` (e.g., no HRV, no power stream)
- `overallConfidenceScore`

Primary sources:

- Counts and latest timestamps by dataset

Prompt usage:

- Confidence-aware language and conservative planning when data quality is low.

## 13.11 Suggested Feature Builder Interfaces

Add deterministic builders in `server/utils/profile-features/`:

- `buildLoadFeatures(userId, range)`
- `buildIntensityFeatures(userId, range, sportSettings)`
- `buildRecoveryFeatures(userId, range)`
- `buildAdherenceFeatures(userId, range)`
- `buildSportFeatures(userId, range, sportSettings)`
- `buildGoalReadinessFeatures(userId, now, goals, features)`
- `buildDataQualityFeatures(userId, range)`

And a composition entrypoint:

- `buildAthleteProfileFeatures(userId, { baseRange, deltaRange, now, timezone })`

Output should be a typed object used by:

- BASE generator prompt context
- DELTA generator prompt context
- EFFECTIVE deterministic merge
- fallback context for existing legacy `ATHLETE_PROFILE` flow during migration

## 14. Parallel-Run Constraints (Do Not Touch Existing System)

This initiative must run alongside the current system without altering current production behavior.

Hard constraints:

- Keep existing `generate-athlete-profile` task unchanged for current users/flows.
- Keep existing `ATHLETE_PROFILE` read path as default until explicit rollout phase.
- New layered pipeline writes only new report types:
  - `ATHLETE_PROFILE_BASE`
  - `ATHLETE_PROFILE_DELTA`
  - `ATHLETE_PROFILE_EFFECTIVE`
- No destructive migrations or field removals tied to this rollout.
- New read-path usage must be behind feature flags and opt-in gates.

Required feature flags (initial):

- `profileLayering.enabled` (master switch)
- `profileLayering.writeBase`
- `profileLayering.writeDelta`
- `profileLayering.writeEffective`
- `profileLayering.readEffectiveForPlanning`
- `profileLayering.readEffectiveForRecommendations`
- `profileLayering.readEffectiveForChat`
- `profileLayering.showVisualProfileUI`

## 15. Implementation TODO (Comprehensive)

## 15.1 Phase 0 - Contracts and Foundations

- [ ] Finalize v1 typed contracts for BASE/DELTA/EFFECTIVE.
- [ ] Create shared TypeScript types in `types/profile-layering.ts`.
- [ ] Add runtime validators (Zod/JSON schema) for all layer payloads.
- [ ] Define `ProfileLayerType` constants and helper guards.
- [ ] Define confidence scoring formula and thresholds.
- [ ] Define standardized error taxonomy for generation/merge failures.

## 15.2 Phase 1 - Deterministic Feature Engine

- [ ] Create `server/utils/profile-features/` module.
- [ ] Implement feature builders listed in section 13.11.
- [ ] Add unit tests per feature builder (window edge cases, missing data, timezone correctness).
- [ ] Add snapshot fixtures for representative athlete archetypes.
- [ ] Add deterministic fingerprint builder for BASE and DELTA inputs.
- [ ] Add fingerprint tests (stable ordering, schema version included in hash seed).

## 15.3 Phase 2 - Layer Generators (Write-Only, No Read Impact)

- [ ] Implement `generate-athlete-profile-base` trigger task.
- [ ] Implement `generate-athlete-profile-delta` trigger task.
- [ ] Implement deterministic `mergeAthleteProfileEffective` utility.
- [ ] Implement `generate-athlete-profile-effective` task (or in-process merge writer).
- [ ] Persist layer outputs as `Report` rows with new `type` values.
- [ ] Add strict skip logic: unchanged fingerprint + valid TTL => no LLM call.
- [ ] Add detailed logs for skip/run reasons.

## 15.4 Phase 3 - Orchestration and Scheduling

- [ ] Add orchestration wrapper task: `refresh-athlete-profile-layers`.
- [ ] Wire event-based trigger from ingest pipeline behind flag.
- [ ] Add per-user debounce/coalescing to avoid burst regenerations.
- [ ] Add scheduled refresher/auditor for stale BASE/DELTA.
- [ ] Add dead-letter and retry strategy for failed layer jobs.
- [ ] Ensure idempotency keys across all layer tasks.

## 15.5 Phase 4 - Read Adapters (Still Defaulting to Legacy)

- [ ] Add `getEffectiveAthleteProfileContext(userId)` adapter with fallback chain:
  - EFFECTIVE -> legacy `ATHLETE_PROFILE` -> basic user/sport context
- [ ] Add compatibility mapper to legacy shape for existing prompt consumers.
- [ ] Add read telemetry to measure fallback rates and freshness.
- [ ] Keep all existing consumers on legacy by default.

## 15.6 Phase 5 - Controlled Consumer Rollout

- [ ] Integrate adapter into `generate-weekly-plan` behind read flag.
- [ ] Integrate adapter into `recommend-today-activity` behind read flag.
- [ ] Integrate adapter into chat/review-goals/suggest-goals behind separate flags.
- [ ] Run shadow comparisons (legacy prompt context vs effective context) and log diffs.
- [ ] Define rollback playbook per consumer (flag off = immediate revert).

## 15.7 Phase 6 - Visual Athlete Profile (Troubleshooting + User Feature)

- [ ] Define UI data contract sourced from deterministic features and EFFECTIVE payload.
- [ ] Build internal troubleshooting view first (admin/dev only):
  - freshness, confidence, fingerprint
  - feature evidence
  - base vs delta vs effective diff
- [ ] Build end-user view (feature-flagged) with clear explanations and confidence badges.
- [ ] Add “Why this changed” panel comparing last two EFFECTIVE profiles.
- [ ] Add source trace (“computed from X workouts / Y wellness records / window dates”).

## 15.8 Phase 7 - Observability, Safety, and Cost Controls

- [ ] Add metrics:
  - token usage by layer
  - skip rate by layer
  - freshness SLA compliance
  - generation latency
  - merge failure rate
- [ ] Add dashboards and alert thresholds.
- [ ] Add quota guardrails for new operations in quota registry.
- [ ] Add budget-aware kill switch (`profileLayering.enabled=false`).
- [ ] Add audit logs for layer refresh decisions.

## 15.9 Phase 8 - Verification and Launch Readiness

- [ ] Define acceptance test matrix by athlete archetype (new user, low data, high data, multi-sport).
- [ ] Add integration tests for fallback behavior when any layer missing/stale.
- [ ] Validate timezone correctness across all windows.
- [ ] Validate no regressions in existing profile pipeline by running both in parallel.
- [ ] Run A/B evaluation on plan quality and adherence outcomes.
- [ ] Document operational runbook (manual refresh, debug, rollback, incident handling).

## 16. Missing Items / Open Decisions

Critical open decisions before implementation:

- [ ] Final BASE horizon default: 6 months or 12 months?
- [ ] DELTA horizon default: 7 days or 14 days?
- [ ] BASE refresh policy: strict monthly vs data-change-triggered monthly hybrid?
- [ ] Confidence formula ownership: deterministic only vs deterministic + model score?
- [ ] Should EFFECTIVE merge be 100% deterministic in v1 (recommended) or allow mini-LLM merge fallback?
- [ ] Exact feature list required for MVP vs later iterations.
- [ ] Target consumers for first rollout (weekly plan only vs weekly plan + recommendation).
- [ ] Visual profile first audience: internal troubleshooting only or selected beta users.
- [ ] Data retention policy for layered reports (keep all vs rolling window).
- [ ] Quota policy for new operations:
  - `athlete_profile_base_generation`
  - `athlete_profile_delta_generation`
  - `athlete_profile_effective_merge`
- [ ] Should we store fingerprints only in `analysisJson.meta` or add indexed columns later?
- [ ] Operational SLA targets (max staleness tolerated by product area).

## 17. MVP Scope Recommendation (Fast, Safe)

Recommended MVP to minimize risk and keep existing system untouched:

- [ ] Implement deterministic feature engine + BASE/DELTA/EFFECTIVE writers.
- [ ] Keep all existing reads on legacy by default.
- [ ] Add only one new consumer behind flag: `generate-weekly-plan`.
- [ ] Add internal troubleshooting UI only (no end-user UI yet).
- [ ] Run parallel for 2-4 weeks and compare outputs/cost before broader rollout.

---

Last Updated: February 24, 2026
Status: Proposed Design (Ready for Phase 0 implementation)
