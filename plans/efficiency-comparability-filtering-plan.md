# Efficiency Comparability & Filtering Plan

## Objective

Improve aerobic efficiency analysis quality by comparing like-for-like sessions and supporting multiple efficiency modalities (power efficiency and pace efficiency).

## Why

- Efficiency trends are misleading when mixed across incompatible sessions.
- Speed, gradient, workout structure, and variability materially change efficiency.
- Users need filtering controls and quality indicators to trust trend interpretation.

## Scope

- Add comparability filters for efficiency charts.
- Add metric mode switch:
  - power efficiency (`NP/HR`)
  - pace efficiency (`meters per heartbeat`, xEff-style)
- Add sample-quality indicator and guardrails for low comparability.

## Non-Goals (v1)

- Perfect cross-sport normalization model.
- Swimming-specific xEff physiology adjustments beyond baseline distance/HR computation.

## Current Baseline (Code Touchpoints)

- Efficiency trend UI:
  - `/Users/hdkiller/Develop/coach-wattz/app/components/EfficiencyTrendChart.vue`
  - `/Users/hdkiller/Develop/coach-wattz/app/components/performance/PerformanceEfficiencyCard.vue`
- Efficiency trend API:
  - `/Users/hdkiller/Develop/coach-wattz/server/api/scores/efficiency-trends.get.ts`

## Product Requirements

- Users can filter to comparable runs/rides by characteristics.
- Users can switch efficiency metric mode without leaving the chart.
- UI surfaces when sample quality is low (insufficient comparable sessions).
- Tooltip shows key comparability attributes for each point.

## Filter Model (v1)

- `sport` (existing)
- `sessionType` (e.g., endurance, tempo, threshold, hills, intervals)
- `tags` (source tags and/or CoachWatts-applied tags)
- `durationBand` (e.g., 20-40m, 40-75m, 75m+)
- `variabilityBand` (e.g., low/mod/high via `normalizedPower / averageWatts`)
- `terrainBand` (flat/rolling/hilly via elevation gain per km)
- `intensityBand` (e.g., avg HR zone or IF proxy)

## Metric Modes

- Power Efficiency:
  - `efficiencyFactor = normalizedPower / averageHr`
- Pace Efficiency (xEff-style baseline):
  - `paceEfficiency = distanceMeters / averageHr`
  - normalize unit for display (m/beat)
- Return both when possible; frontend chooses displayed series by mode.

## API Contract Changes

- Extend `/api/scores/efficiency-trends` query params:
  - `mode=power|pace`
  - `sessionType`, `tags[]`, `durationBand`, `variabilityBand`, `terrainBand`, `intensityBand`
- Extend response:
  - `trends[]` includes `comparabilityMeta`
  - `sampleQuality` summary (`high|medium|low` + reasons)
  - `appliedFilters` echo

## Backend Work Breakdown

1. Add comparability helper:
   - `/Users/hdkiller/Develop/coach-wattz/server/utils/performance/efficiency-comparability.ts`
2. Extend efficiency endpoint:
   - `/Users/hdkiller/Develop/coach-wattz/server/api/scores/efficiency-trends.get.ts`
3. Classify workouts into session archetypes:
   - use available metrics and tags from ingested workout metadata.
4. Compute and return `sampleQuality` with minimum-sample rules.

## Frontend Work Breakdown

1. Add filter controls and mode switch in:
   - `/Users/hdkiller/Develop/coach-wattz/app/components/EfficiencyTrendChart.vue`
2. Add filter summaries in performance card header:
   - `/Users/hdkiller/Develop/coach-wattz/app/components/performance/PerformanceEfficiencyCard.vue`
3. Add comparability badge and warning states in chart area.

## Data Source Strategy for Tags

- Use existing source tags when available (Intervals/other integrations).
- Where missing, use CoachWatts-derived tags from workout summary classification.
- Preserve provenance (`sourceTag` vs `derivedTag`) for explainability.

## Testing Strategy

- Unit tests for comparability grouping and filter logic:
  - `/Users/hdkiller/Develop/coach-wattz/server/utils/performance/efficiency-comparability.test.ts`
- API tests for filtering behavior and mode switching.
- UI tests for filter persistence, badge states, and tooltip correctness.

## Rollout Plan

1. Phase 1: API filters + sample quality backend (feature flag).
2. Phase 2: UI filters and mode switch.
3. Phase 3: recommendation-context integration for "compare like-for-like" hints.

## Metrics

- Ratio of chart views using filters.
- Reduction in low-quality comparison states.
- User interaction with mode switch (power vs pace).
- Decrease in support feedback about misleading efficiency trends.

## Risks and Mitigations

- Sparse data after filtering can leave too few points.
  - Mitigation: clear fallback and sample quality warnings.
- Tag inconsistency across sources.
  - Mitigation: provenance labeling + derived taxonomy fallback.
- Over-complex UI controls.
  - Mitigation: presets and collapsible advanced filters.

## Exit Criteria

- Users can filter efficiency trends to comparable sessions.
- Metric mode switch works for supported sports.
- Chart clearly signals confidence/sample quality.
- Default view is more robust than all-effort mixed trend.
