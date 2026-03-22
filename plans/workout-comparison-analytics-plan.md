# Workout Comparison Analytics: Architectural Plan

## 1. Executive Summary

The goal is to extend the current "Time-Bucket" analytics engine into an **Entity-Based Comparison Engine**. This allows athletes and coaches to compare performance metrics across specific workouts, either for a single athlete (historical progression) or across multiple athletes (competitive benchmarking).

## 2. Core Concept: Entity-Based Analytics

While our current system groups data by time buckets (Daily, Weekly, Monthly), the comparison system requires grouping by **Entity ID (WorkoutId)**.

### 2.1 Comparison Contract

We should **not** overload `scope` with a new comparison-only target. Scope should remain responsible for access context (`self`, `athlete`, `athletes`, `athlete_group`, `team`), while workout comparison should be expressed by a separate `comparison` block in the query contract.

```typescript
{
  "source": "workouts",
  "scope": {
    "target": "athletes",
    "targetIds": ["athlete-a", "athlete-b"]
  },
  "comparison": {
    "type": "workouts",
    "mode": "summary",
    "workoutIds": ["uuid-1", "uuid-2", "..."]
  },
  "xAxis": {
    "type": "entity_label", // Workout Title + Date
    "sort": "chronological"
  },
  "metrics": [
    { "field": "averageWatts", "aggregation": "avg" },
    { "field": "efficiencyFactor", "aggregation": "avg" }
  ]
}
```

This keeps access control, dashboard inheritance, and comparison behavior cleanly separated.

## 3. Comparison Modes

| Mode                   | Data Level    | Visualization     | Use Case                                                      |
| :--------------------- | :------------ | :---------------- | :------------------------------------------------------------ |
| **Summary Comparison** | Workout Meta  | Bar / Scatter     | Comparing 20min power test results over 6 months.             |
| **Stream Overlay**     | WorkoutStream | Multi-series Line | Overlapping power/HR profiles from two identical sessions.    |
| **Interval Analysis**  | LapSplits     | Grouped Bar       | Consistency check: Interval 1 vs. Interval 5 across sessions. |

## 4. Technical Architecture

### 4.1 Backend Engine (`analyticsRepository`)

- **Summary Query**: A new `queryWorkoutComparison` method that fetches `Workout` records by ID, ensures they belong to accessible athletes, and flattens them into a chart-ready format.
- **Stream Query**: A `queryStreamComparison` method to fetch `WorkoutStream` data.
  - **Normalization**: Stream comparison must support explicit alignment modes instead of a single implicit $T=0$ model:
    - `elapsed_time`
    - `distance`
    - `lap_index`
    - `percent_complete`
  - **Downsampling**: Reduce high-frequency data (e.g., 1Hz for 4 hours) to ~500 points using a "Largest Triangle Three Buckets" (LTTB) or simple averaging algorithm for frontend performance.
- **Security**: Validate `workoutIds` at the workout level, not just the athlete relationship level:
  - every workout must exist
  - every workout must belong to an accessible athlete
  - mixed-access selections should fail clearly rather than partially render
  - duplicate/private/canonical workout behavior must be consistent
- **Reuse First**: Reuse existing `Workout`, `WorkoutStream`, `lapSplits`, power-curve, pacing, and interval-analysis codepaths where possible instead of creating a parallel stream-analysis stack.

### 4.2 Frontend Integration

- **`AnalyticsBaseWidget` Extension**: Support summary comparison in the widget layer, but do not force stream and interval comparison into the exact same generic widget abstraction immediately.
- **Specialized Viewer**: Treat stream overlays and interval comparison as a dedicated workout-comparison experience first, then promote stable patterns into widgets later if needed.
- **Comparison Basket**: A UI utility (possibly a pinia store) that tracks selected workouts across different pages (Activities, Roster).
- **Global vs. Local Context**:
  - **Athletes**: Compare "My Best 5s Power" over the last 3 workouts.
  - **Coaches**: Compare "This Morning's Intervals" for 5 athletes in the "Pro Team" group.

### 4.3 Persistence and Dashboard Rules

The saved-widget contract must be explicit before implementation:

- **Static Comparison Widgets**: Saved comparison widgets store fixed `workoutIds`. They do not auto-refresh to "latest matching workouts" in v1.
- **Scope Inheritance**: Comparison widgets do **not** inherit tab athlete scope in the normal way once `workoutIds` are pinned, because the entity list is already explicit.
- **Date Range Inheritance**: Summary comparison widgets may still use date range for display filters or metadata, but pinned `workoutIds` are the authoritative selection.
- **Serialization**: Dashboard widgets must persist:
  - `comparison.type`
  - `comparison.mode`
  - `comparison.workoutIds`
  - `alignmentMode` when relevant
  - any pinned metric/stream field selections
- **Fallback Behavior**: If one or more pinned workouts are deleted or become inaccessible, the widget should render a clear partial-data or unavailable state rather than silently changing the comparison set.

## 5. UI/UX Workflow

### 5.1 The Comparison Builder

A specialized version of the Chart Builder:

1. **Select Workouts**: Search/filter workouts by date, type, or athlete.
2. **Select Metrics**: Choose standard fields (Watts, HR, Pace) or Custom Fields.
3. **Select Mode**: "Summary Overview" or "Stream Profile".
4. **Select Alignment**: For stream/interval comparisons, choose elapsed time, distance, lap index, or percent complete.
5. **Save/Pin**: Add the comparison to a dashboard or an Athlete's profile.

### 5.2 The "Basket" Experience

- **Action**: "Add to Comparison" button on activity cards.
- **Trigger**: A floating action button (FAB) appears when 2+ workouts are selected.
- **Outcome**: Opens a comparison modal with a temporary `<AnalyticsBaseWidget />` pre-configured.

### 5.3 Comparison Type Boundaries

The UI should clearly distinguish between three different comparison semantics:

- **Workout Summary Comparison**: Compare workout-level metrics across selected workouts.
- **Stream Overlay Comparison**: Compare full time/distance profiles of selected workouts.
- **Interval/Lap Comparison**: Compare repeated segments or lap structures across workouts.

These modes are related, but they are not interchangeable. The UX should not imply that any arbitrary workout pair can always be compared meaningfully in all three ways.

## 6. Predefined Comparison Presets

- **Threshold Progression**: Bar chart of FTP/LTHR across selected tests.
- **Pacing Profile Overlay**: Line chart of speed/grade-adjusted-pace for similar routes.
- **Efficiency Correlation**: Scatter plot of Avg Watts vs. Avg HR for a set of recovery rides.
- **Squad Performance Benchmarking**: (Coach Only) Athlete A vs. Athlete B vs. Squad Average for a specific training session.

## 7. Implementation Roadmap

1. **Phase 1**: Add summary workout comparison as a new comparison contract on top of the existing analytics engine.
   - implement `comparison.type = workouts`
   - support fixed `workoutIds`
   - support workout-level metrics only
   - validate access at the workout level
2. **Phase 2**: Add the UI basket and temporary comparison modal for summary comparisons.
   - selection from activities / roster / workout surfaces
   - pinning to dashboard with fixed `workoutIds`
3. **Phase 3**: Build a dedicated stream-comparison viewer.
   - support elapsed-time, distance, and percent-complete alignment
   - support downsampling and field selection
   - explicitly reuse existing `WorkoutStream` / `lapSplits` / pacing code
4. **Phase 4**: Add lap/interval comparison on top of the dedicated viewer.
   - define what counts as a comparable interval
   - distinguish true intervals from generic splits/laps
5. **Phase 5**: Add coach-specific automation and group comparison helpers.
   - compare selected session cohorts
   - compare tagged workouts
   - add squad-average or cohort benchmarks where useful

## 8. Key Recommendations

- **Keep scope and comparison separate**: access context should not be overloaded with comparison entity selection.
- **Start with summary comparison**: it fits the current analytics/dashboard model best and delivers value quickly.
- **Treat stream comparison as a specialized product surface first**: it is more complex than a standard chart widget.
- **Make alignment explicit**: elapsed time alone is not enough for meaningful workout overlays.
- **Decide persistence before building**: saved comparison widgets need a stable, fixed-workout contract.
- **Use the existing workout intelligence stack**: `WorkoutStream`, `lapSplits`, efficiency metrics, power-curve logic, and pacing services already cover much of the needed groundwork.
