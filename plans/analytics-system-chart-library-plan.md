# Analytics System Chart Library Plan

## Goal
Build a competitive library of pre-built analytics charts for athletes and coaches, grounded in the metrics and workflows that already exist across `/analytics`, `/fitness`, `/workouts`, `/dashboard`, and `/coaching`.

This document is the implementation tracker for:
- expanding the current system chart preset library
- closing data/visualization gaps in the analytics engine
- reusing proven chart ideas already present elsewhere in the platform
- creating a coherent chart browsing, pinning, and dashboard experience

## Current Baseline

### Existing system presets
- [x] Performance Management (PMC)
- [x] Weekly Load Trend
- [x] HRV & Recovery Correlation

### Existing chart concepts elsewhere in the platform
- [x] PMC / Training Load & Form
- [x] Recovery trajectory
- [x] Readiness estimate
- [x] Sleep duration
- [x] HRV trend
- [x] Resting HR trend
- [x] Weight progression
- [x] Blood pressure trend
- [x] Weekly power / HR zone summaries
- [x] Readiness vs performance correlation concept
- [x] Workout execution / zone / recovery analytics concepts

### Major current gaps
- [ ] Too few built-in presets
- [ ] No scatter plots in the analytics widget engine
- [ ] No stacked bars
- [ ] No heatmaps for team views
- [ ] No combo charts with dual-axis support
- [ ] No dedicated preset metadata model beyond config blobs
- [ ] No category-driven chart browsing and recommendation
- [ ] No implementation parity between analytics library and existing chart-rich pages

## Product Standard
To be competitive, the chart library should cover:
- training load and form
- volume and intensity
- recovery and wellness
- compliance and execution
- zones and distribution
- coach and team views
- custom numeric metrics
- correlations and comparisons

## Priority Preset Library

### Phase 1: Foundation Presets
- [ ] Performance Management (PMC) polish and parity with existing PMC chart
- [ ] Weekly Load Trend
- [ ] Weekly Volume Trend
- [ ] Load vs Volume Combo
- [ ] Recovery Trajectory
- [ ] HRV Trend
- [ ] Resting HR Trend
- [ ] Sleep Duration Trend
- [ ] Readiness Estimate Trend
- [ ] Body Mass Trend

### Phase 2: Training Distribution Presets
- [ ] Weekly Power Zone Distribution
- [ ] Weekly Heart Rate Zone Distribution
- [ ] Threshold Exposure Trend
- [ ] Session Density Trend
- [ ] Discipline Mix Trend
- [ ] Workout Type Distribution

### Phase 3: Execution / Compliance Presets
- [ ] Planned vs Completed Volume
- [ ] Planned vs Completed Load
- [ ] Adherence Trend
- [ ] Weekly Completion Rate
- [ ] Missed / delayed workout trend

### Phase 4: Correlation / Insight Presets
- [ ] HRV vs Recovery scatter
- [ ] Readiness vs Performance scatter
- [ ] Sleep vs Recovery correlation
- [ ] Wellness vs Load correlation
- [ ] Custom metric vs performance correlation

### Phase 5: Coach / Team Presets
- [ ] Roster Fatigue Heatmap
- [ ] Roster Recovery Heatmap
- [ ] Team Load Comparison
- [ ] Team CTL Comparison
- [ ] Team Compliance Comparison
- [ ] Athlete group comparison trend

### Phase 6: Workout-Specific Presets
- [ ] Power Duration Curve
- [ ] Peak power trend by duration
- [ ] Time above threshold trend
- [ ] Dominant zone trend
- [ ] Recovery hit-rate trend

## Chart Catalog Specification

Each system chart should have:
- [ ] stable id
- [ ] name
- [ ] short description
- [ ] audience: athlete / coach / both
- [ ] category: performance / recovery / compliance / distribution / team / custom
- [ ] recommended scope: self / athlete / team / athlete_group
- [ ] required data sources
- [ ] fallback empty-state copy
- [ ] supported visualization type
- [ ] pinned dashboard title suggestion

## Engine Requirements

### Core query engine
- [x] secure allowlisted metric querying
- [ ] support multi-axis configs
- [ ] support mixed series types in one chart
- [ ] support categorical grouping
- [ ] support richer filters
- [ ] support preset-specific computed series
- [ ] support scatter datasets
- [ ] support stacked datasets

### Visualization primitives
- [x] line chart
- [x] bar chart
- [ ] stacked bar chart
- [ ] scatter plot
- [ ] combo chart
- [ ] heatmap
- [ ] horizontal bar

### Preset support APIs
- [ ] dedicated weekly compliance endpoint
- [ ] dedicated power duration endpoint
- [ ] dedicated correlation endpoint(s)
- [ ] dedicated team heatmap endpoint
- [ ] dedicated planned-vs-completed endpoint

## Reuse Targets From Existing Product

### Reuse from `/fitness`
- [ ] Recovery Trajectory
- [ ] Readiness Estimate
- [ ] Sleep Duration
- [ ] HRV Trend
- [ ] Resting HR Trend
- [ ] Weight Trend
- [ ] Blood Pressure
- [ ] HRV + RHR dual-axis chart

### Reuse from `/performance` and PMC modal
- [ ] PMC summary framing
- [ ] CTL / ATL / TSB explanation content
- [ ] period selector patterns

### Reuse from `/workouts`
- [ ] power duration concepts
- [ ] zone-related metrics
- [ ] threshold exposure concepts
- [ ] workout execution signal concepts

### Reuse from coaching surfaces
- [ ] team fatigue concepts
- [ ] roster comparison concepts
- [ ] athlete-specific scoped analytics patterns

## Delivery Roadmap

### Milestone 1: Competitive athlete starter pack
- [ ] Finish 10 high-value athlete presets
- [ ] Add categories and descriptions to browser
- [ ] Add empty states and preset badges
- [ ] Ensure pinning to dashboard is stable

Definition of done:
- athlete can browse and pin a meaningful set of presets without opening the builder

### Milestone 2: Distribution and compliance pack
- [ ] Add zones, adherence, and planned-vs-completed charts
- [ ] Add stacked and combo support where required
- [ ] Connect charts to coaching planning workflows

Definition of done:
- coach can review whether training was executed, not just how much was done

### Milestone 3: Team and coach pack
- [ ] Add multi-athlete comparison charts
- [ ] Add team heatmaps
- [ ] Add scoped presets for coach dashboards

Definition of done:
- coach dashboards become operational tools for daily decision-making

### Milestone 4: Advanced insight pack
- [ ] Add scatter/correlation views
- [ ] Add power-duration and peak models
- [ ] Add custom metric presets and correlations

Definition of done:
- analytics library supports exploratory insight, not only reporting

## Recommended Build Order
1. Athlete foundation pack
2. Visualization primitive upgrades
3. Compliance pack
4. Team pack
5. Advanced insight pack

## Immediate TODO

### Track A: Preset backlog definition
- [ ] Expand `ANALYTICS_SYSTEM_PRESETS` with categories and audience metadata
- [ ] Define the first 10 production presets in code
- [ ] Write display copy for each preset

### Track B: Engine parity
- [ ] Add support for combo charts
- [ ] Add support for scatter plots
- [ ] Add support for stacked bars
- [ ] Add support for preset-specific dataset formatting

### Track C: API support
- [ ] Add weekly compliance endpoint
- [ ] Add planned-vs-completed aggregation endpoint
- [ ] Add power duration curve endpoint
- [ ] Add correlation endpoint(s)
- [ ] Add team fatigue heatmap endpoint

### Track D: Browser / dashboard UX
- [ ] Group presets by category in `/analytics/browse`
- [ ] Add athlete / coach recommendation badges
- [ ] Add “best for” blurbs in library cards
- [ ] Add quick filter chips for Performance / Recovery / Compliance / Team
- [ ] Add “pin as scoped athlete widget” confirmation copy

### Track E: Migration of existing chart ideas
- [ ] Port key `/fitness` charts into system presets
- [ ] Port PMC detail parity from the current PMC chart
- [ ] Port zone summaries into analytics widgets
- [ ] Port readiness correlation concept into analytics widgets

## Risks
- Existing generic analytics engine may not be enough for advanced charts without preset-specific endpoints.
- Team charts will need stronger access-control and scope semantics than self charts.
- If chart types expand without a metadata model, the browse experience will become hard to manage.
- Rebuilding charts already present elsewhere without reuse will create duplicated logic and drift.

## Success Criteria
- A new user sees a meaningful preset library immediately.
- A coach can answer load, recovery, compliance, and team-risk questions without building custom charts.
- Existing chart-rich product areas become part of one unified analytics system instead of parallel experiences.
- The first 10 presets feel complete enough that the builder becomes optional for common use cases.
