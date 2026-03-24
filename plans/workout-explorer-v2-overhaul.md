# Plan: Workout Explorer V2 - Advanced Analytics & Interactive Visualization

## Objective

Transform the "Workout Explorer" from a basic chart viewer into a professional-grade diagnostic tool that exceeds the capabilities of market leaders like Intervals.icu and TrainingPeaks (WKO5). The focus is on **Diagnostic Power**, **Visual Clarity**, and **Interactive Speed**.

---

## 1. Advanced Metric Engine (Backend)

_Location: `server/utils/analytics/` and `server/api/analytics/workout-explorer/`_

### 1.1 Virtual Stream Calculator

Implement a high-performance logic layer to compute derived metrics on-the-fly from raw sensor data:

- **W' Balance (Work Capacity)**: Depletion/recharge model for anaerobic energy.
- **Torque & Force**: Calculated from `watts` and `cadence`.
- **Aerobic Decoupling (P:HR)**: Real-time efficiency ratio throughout the session.
- **VAM (Vertical Ascent Meters)**: Climbing speed (m/h) for segments.
- **Grade Adjusted Pace (GAP)**: Running effort normalized for incline.

### 1.2 Data Optimization

- **LTTB Downsampling**: Implement the "Largest-Triangle-Three-Buckets" algorithm to reduce 1Hz stream data to ~1000 points while preserving peaks.
- **Polyline Encoding**: Encode GPS coordinates to minimize payload size for the map.

---

## 2. New Visual Types & Components

_Location: `app/components/analytics/`_

### 2.1 `MapRenderer.vue` (Interactive GPS Analysis)

- **Power Heatmap**: Colors the GPS line based on power zones (Z1-Z6+).
- **Selection Highlighting**: When an interval is selected on a chart, the corresponding road segment is highlighted on the map.
- **Terrain Overlay**: Toggle between Satellite, Terrain, and OpenStreetMap.

### 2.2 `DensityHeatmap.vue` (2D Frequency Distribution)

- **Power-Cadence Grid**: A 2D heatmap showing time spent at specific output/rhythm combinations.
- **Zone Overlays**: Visualize where the "Sweet Spot" or "Threshold" live on the grid.

### 2.3 `AdvancedChartRenderer.vue` (Chart.js Extensions)

- **Logarithmic X-Axis**: Essential for Power-Duration (MMP) curves.
- **Radar Charts**: "Workout Signature" (Aerobic vs. Anaerobic vs. Technical).
- **Box & Whisker**: Visualize consistency and variance per interval.
- **Histograms**: Pure frequency distribution of power/HR/cadence.

---

## 3. Interaction & Orchestration

_Location: `app/composables/useAnalyticsBus.ts`_

### 3.1 Global Scrubbing (The "Sync")

- Implement a global event bus so that hovering on any chart moves the vertical crosshair and the map marker simultaneously.

### 3.2 Selection-Aware Summary

- **Zoom-to-Recalculate**: When a user zooms or selects a range, the "Headline Stats" (Avg Power, NP, TSS, etc.) must update to reflect only that selection.
- **Crop Tool**: Allow users to "Crop" the analysis window to focus on a specific hill climb or interval set.

---

## 4. Expanded Preset Library

_Location: `app/utils/workout-explorer-presets.ts`_

### 4.1 Physiology Tier

- **MMP vs. Season PRs**: Compare today's peaks against the last 90 days.
- **Aerobic Drift**: Shaded area between normalized Power and HR lines.

### 4.2 Technique Tier

- **Quadrant Analysis**: Scatter plot of Torque vs. Cadence.
- **Neuromuscular Load**: Radar chart of pedal force vs. peak power.

### 4.3 Environment & Terrain Tier

- **VAM Profile**: Bar chart of climbing speed per lap.
- **Wind Correlation**: Map markers showing wind direction vs. heading.

---

## 5. Implementation Phases

### Phase 1: Data & Foundation

- [ ] Implement `VirtualStreamEngine` in the backend.
- [ ] Add `lat/lng` support to `streams.post.ts`.
- [ ] Implement LTTB downsampling for performance.

### Phase 2: Core Visuals & Maps

- [ ] Build `MapRenderer.vue` with Leaflet.
- [ ] Build `DensityHeatmap.vue` for Power-Cadence analysis.
- [ ] Update `ChartRenderer.vue` to support Logarithmic axes and Radar charts.

### Phase 3: Interactive Sync

- [ ] Implement `useAnalyticsBus` for synchronized scrubbing.
- [ ] Add Selection/Zoom events to `BaseWidget.vue`.
- [ ] Connect selection events to Headline Stats re-calculation.

### Phase 4: Intelligence & Polish

- [ ] Add 10+ new "Elite" presets to the Library.
- [ ] Implement "AI Segment Analysis" (Gemini integration for selected ranges).
- [ ] Add "Poster Mode" high-res PNG export.
