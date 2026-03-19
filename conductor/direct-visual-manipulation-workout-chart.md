# Implementation Plan: Direct Visual Manipulation in Workout Chart

## Objective

Enable users to edit workout intensity directly in the chart by clicking to select steps and dragging the top edge of bars to adjust values. Ensure repeated steps (intervals) are cross-highlighted and updated together.

## Key Components & Files

- `app/components/workouts/WorkoutChart.vue`: Primary chart for Bike/Swim/Gym.
- `app/components/workouts/WorkoutRunChart.vue`: Primary chart for Runs.
- `app/components/workouts/planned/WorkoutStepsEditor.vue`: Source of truth for editing.

## Implementation Steps

### Phase 1: Highlighting & Selection

1.  **Selection State**: Add `selectedStepUid` to both chart components.
2.  **Visual Feedback**: Apply conditional styling (e.g., ring, opacity) to bars. If a bar is selected, all bars sharing the same `uid` (instances of the same repeated step) will be highlighted.
3.  **Click Handler**: Add `mousedown` listener to the bar container to set the active `uid`.

### Phase 2: Intensity Dragging

1.  **Drag Handle**: Add an invisible horizontal drag handle at the top edge of each bar (active only in `allowEdit` mode).
2.  **Dragging Logic**:
    - `mousedown`: Start tracking mouse movement and record initial intensity.
    - `mousemove` (Global): Calculate new intensity based on mouse Y-position relative to chart height.
    - `mouseup` (Global): Commit the change and emit `update:steps`.
3.  **Recursive Update**: Implement `updateIntensityRecursively` to find and modify the step in the nested structure using its `uid`.

### Phase 3: Robust Persistence Fixes (Bug Cleanup)

1.  **Refactor Targeting**: Finalize `applyRunTargetPolicyToStep` to prioritize `primaryTarget` and avoid forced Power conversions for Runs.
2.  **Metric-Agnostic Stats**: Ensure "Avg Intensity" and "TSS" in the chart update in real-time during dragging across all metrics (Power, HR, Pace).

## Verification

1.  Open a workout template in the Plan Architect drawer.
2.  Switch to the "Edit" tab.
3.  Click a bar in the chart; verify all repeated instances highlight.
4.  Drag the top of a bar up/down; verify the bar height and summary stats update in real-time.
5.  Save and refresh; verify the new intensity persists correctly.
6.  Verify the same behavior for Run workouts (Pace/HR/Power modes).
