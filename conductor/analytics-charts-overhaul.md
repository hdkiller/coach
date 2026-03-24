# Analytics Charts Overhaul: Modularization & Advanced Features

## Objective

Refactor the monolithic `BaseWidget.vue` into a modular, maintainable architecture while adding advanced visualization features (Zoom, Delta Mode, Regression) and a per-widget settings system.

## Key Files & Context

- **Orchestrator**: `app/components/analytics/BaseWidget.vue` (to be refactored)
- **New Components**:
  - `app/components/analytics/ChartRenderer.vue` (Chart.js wrapper)
  - `app/components/analytics/HeatmapGrid.vue` (Heatmap logic)
  - `app/components/analytics/WidgetSettingsModal.vue` (Per-widget configuration)
- **Composables**:
  - `app/composables/useAnalyticsData.ts` (Data fetching & normalization)
  - `app/composables/useAnalyticsOverlays.ts` (Math for rolling averages, regression, and delta)
- **Metadata**: `app/utils/analytics-presets.ts` (Settings schema expansion)

## Implementation Plan

### Phase 1: Modularization (Component Decomposition)

1.  **Extract Overlays Logic**: Move `rollingAverage`, `computeBand`, `calculateRegression`, and `averageSeries` to `useAnalyticsOverlays.ts`.
2.  **Extract Heatmap Logic**: Create `HeatmapGrid.vue` and move the custom HTML/CSS grid logic there.
3.  **Create ChartRenderer.vue**:
    - Register all Chart.js components and plugins.
    - Handle `Line`, `Bar`, and `Scatter` rendering.
    - Implement standard theming (colors, typography, grid styles).
4.  **Refactor BaseWidget.vue**:
    - Reduce to < 200 lines.
    - Focus on prop normalization and state (loading, error, response).
    - Delegate rendering to `ChartRenderer.vue` or `HeatmapGrid.vue`.

### Phase 2: Visual & Interaction Upgrades

1.  **Enhanced Grids & Typography**: Update `chartOptions` in `ChartRenderer.vue` with modernized font weights and subtle border styles.
2.  **Vertical Crosshairs**: Implement a custom plugin or use `tooltip.mode: 'index'` with a vertical line drawn on the canvas.
3.  **Zoom & Pan Interaction**:
    - Install and register `chartjs-plugin-zoom`.
    - Add controls (or simple pinch/drag) for zooming into time horizons.
4.  **Gradients**: Add a utility to create linear gradients for `Line` chart datasets (area fills).

### Phase 3: Advanced Analysis Features

1.  **Comparison Delta Mode**:
    - When two series are selected (e.g., Athlete A and Athlete B), allow adding a "Delta" dataset (A - B).
    - Visualize as a bar chart overlay or a separate line.
2.  **Advanced Regression**: Update `useAnalyticsOverlays.ts` to support regression lines for all time-series (Line/Bar) charts, not just Scatter.

### Phase 4: Chart-Specific Settings System

1.  **Schema Expansion**: Update `AnalyticsPresetConfig` in `app/utils/analytics-presets.ts` to include a `settings` object.
2.  **Settings UI**: Create `WidgetSettingsModal.vue` allowing overrides for:
    - Y-Axis Scaling (Dynamic/Zoom vs Fixed Min).
    - Smoothing (Line charts).
    - Visibility of specific overlays or metrics.
3.  **Dashboard Integration**: Update `pinToDashboard` in `browse.vue` to capture and persist the current settings state.

## Verification & Testing

- **Visual Regression**: Verify all 40+ system presets still render correctly after refactor.
- **Functionality**:
  - Test Zoom/Pan on mobile and desktop.
  - Verify "Delta Mode" correctly calculates differences.
  - Ensure "Y-Axis Scaling" setting actually modifies the chart axis.
- **Performance**: Monitor memory usage and re-renders, especially with multiple charts on a dashboard.
