export type AnalyticsPresetCategory =
  | 'performance'
  | 'recovery'
  | 'distribution'
  | 'compliance'
  | 'correlation'
  | 'team'
  | 'custom'

export type AnalyticsPresetAudience = 'athlete' | 'coach' | 'both'
export type AnalyticsPresetScope = 'self' | 'athlete' | 'athletes' | 'athlete_group' | 'team'
export type AnalyticsVisualType =
  | 'line'
  | 'bar'
  | 'combo'
  | 'stackedBar'
  | 'scatter'
  | 'horizontalBar'
  | 'heatmap'

export interface AnalyticsPresetConfig {
  source?: 'workouts' | 'wellness' | 'nutrition'
  type?: 'line' | 'bar'
  endpoint?: string
  timeRange?: {
    type: 'rolling' | 'ytd' | 'fixed'
    value?: string
    startDate?: string
    endDate?: string
  }
  grouping?: 'daily' | 'weekly' | 'monthly'
  metrics?: Array<{ field: string; aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count' }>
  scope?: { target: AnalyticsPresetScope; targetId?: string; targetIds?: string[] }
  styling?: Record<string, any>
  presetOptions?: Record<string, any>
  units?: {
    x?: string
    y?: string
    y1?: string
    datasets?: string[]
  }
  [key: string]: any
}

export interface AnalyticsSystemPreset extends AnalyticsPresetConfig {
  id: string
  name: string
  description: string
  category: AnalyticsPresetCategory
  audience: AnalyticsPresetAudience
  recommendedScope: AnalyticsPresetScope
  visualType: AnalyticsVisualType
  requiredCapabilities: string[]
  isSystem: true
}

function queryPreset(
  preset: Omit<AnalyticsSystemPreset, 'isSystem' | 'endpoint' | 'type'> & {
    source: 'workouts' | 'wellness' | 'nutrition'
    grouping: 'daily' | 'weekly' | 'monthly'
    metrics: Array<{ field: string; aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count' }>
  }
): AnalyticsSystemPreset {
  return {
    ...preset,
    isSystem: true,
    type:
      preset.visualType === 'bar' ||
      preset.visualType === 'stackedBar' ||
      preset.visualType === 'combo'
        ? 'bar'
        : 'line'
  }
}

function endpointPreset(
  preset: Omit<AnalyticsSystemPreset, 'isSystem' | 'type'> & {
    endpoint: string
  }
): AnalyticsSystemPreset {
  return {
    ...preset,
    isSystem: true,
    type:
      preset.visualType === 'bar' ||
      preset.visualType === 'stackedBar' ||
      preset.visualType === 'combo'
        ? 'bar'
        : 'line'
  }
}

export const ANALYTICS_PRESET_CATEGORIES: Array<{ label: string; value: AnalyticsPresetCategory }> =
  [
    { label: 'Performance', value: 'performance' },
    { label: 'Recovery', value: 'recovery' },
    { label: 'Distribution', value: 'distribution' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Correlation', value: 'correlation' },
    { label: 'Team', value: 'team' }
  ]

export const ANALYTICS_SYSTEM_PRESETS: AnalyticsSystemPreset[] = [
  queryPreset({
    id: 'system-pmc',
    name: 'Performance Management (PMC)',
    description: 'Track Fitness (CTL), Fatigue (ATL), and Form (TSB) in one training-load chart.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'daily',
    metrics: [
      { field: 'ctl', aggregation: 'avg' },
      { field: 'atl', aggregation: 'avg' },
      { field: 'tsb', aggregation: 'avg' }
    ],
    units: { y: 'load' },
    styling: { showLegend: true }
  }),
  queryPreset({
    id: 'system-weekly-tss',
    name: 'Weekly Load Trend',
    description: 'See weekly Training Stress Score accumulation at a glance.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [{ field: 'tss', aggregation: 'sum' }],
    units: { y: 'tss' },
    styling: { showLegend: true }
  }),
  queryPreset({
    id: 'system-weekly-volume',
    name: 'Weekly Volume Trend',
    description: 'Track total training duration over time.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [{ field: 'durationSec', aggregation: 'sum' }],
    units: { y: 'duration' }
  }),
  queryPreset({
    id: 'system-load-vs-volume',
    name: 'Load vs Volume',
    description: 'Compare duration and training load across the same time horizon.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [
      { field: 'durationSec', aggregation: 'sum' },
      { field: 'tss', aggregation: 'sum' }
    ],
    units: {
      y: 'duration',
      y1: 'tss',
      datasets: ['duration', 'tss']
    },
    styling: {
      showLegend: true,
      datasetTypes: ['bar', 'line']
    }
  }),
  queryPreset({
    id: 'system-recovery-trajectory',
    name: 'Recovery Trajectory',
    description: 'Follow daily recovery score over time.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'recoveryScore', aggregation: 'avg' }],
    units: { y: '%' }
  }),
  queryPreset({
    id: 'system-hrv-trend',
    name: 'HRV Trend',
    description: 'Track heart-rate variability trends across your recovery cycle.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'hrv', aggregation: 'avg' }],
    units: { y: 'ms' }
  }),
  queryPreset({
    id: 'system-resting-hr',
    name: 'Resting HR Trend',
    description: 'Monitor resting heart-rate shifts that often signal readiness changes.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'restingHr', aggregation: 'avg' }],
    units: { y: 'bpm' }
  }),
  queryPreset({
    id: 'system-sleep-duration',
    name: 'Sleep Duration',
    description: 'Review how much you slept on each day and across each week.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'sleepHours', aggregation: 'avg' }],
    units: { y: 'h' }
  }),
  queryPreset({
    id: 'system-readiness-estimate',
    name: 'Readiness Estimate',
    description: 'Use recovery score as the default readiness signal over time.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'recoveryScore', aggregation: 'avg' }],
    units: { y: '%' }
  }),
  queryPreset({
    id: 'system-weight-trend',
    name: 'Body Mass Trend',
    description: 'Track body mass changes across your training cycle.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'daily',
    metrics: [{ field: 'weight', aggregation: 'avg' }],
    units: { y: 'kg' }
  }),
  endpointPreset({
    id: 'system-blood-pressure',
    name: 'Blood Pressure',
    description: 'View systolic and diastolic values over time.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'blood-pressure-trend' },
    units: { y: 'mmHg', datasets: ['mmHg', 'mmHg'] }
  }),
  endpointPreset({
    id: 'system-weekly-power-zones',
    name: 'Weekly Power Zone Distribution',
    description: 'See where your training time lands across power zones each week.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-power-zones' },
    units: { y: 'h' }
  }),
  endpointPreset({
    id: 'system-weekly-hr-zones',
    name: 'Weekly Heart Rate Zone Distribution',
    description: 'See weekly intensity distribution based on heart-rate zones.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-hr-zones' },
    units: { y: 'h' }
  }),
  endpointPreset({
    id: 'system-threshold-exposure',
    name: 'Threshold Exposure Trend',
    description: 'Track time spent at or above threshold across your training blocks.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'time-above-threshold' },
    units: { y: 'h' }
  }),
  endpointPreset({
    id: 'system-session-density',
    name: 'Session Density',
    description: 'Count how many completed sessions you string together each week.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'session-density' },
    units: { y: 'sessions' }
  }),
  endpointPreset({
    id: 'system-discipline-mix',
    name: 'Discipline Mix',
    description: 'Break down your recent training time by discipline.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'horizontalBar',
    requiredCapabilities: ['horizontalBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'discipline-mix' },
    units: { x: 'h' }
  }),
  endpointPreset({
    id: 'system-workout-type-distribution',
    name: 'Workout Type Distribution',
    description: 'See how your recent sessions are distributed across workout categories.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'horizontalBar',
    requiredCapabilities: ['horizontalBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'workout-type-distribution' },
    units: { x: 'sessions' }
  }),
  endpointPreset({
    id: 'system-planned-vs-completed-volume',
    name: 'Planned vs Completed Volume',
    description: 'Compare scheduled and completed training duration week by week.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/planned-vs-completed',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'volume' },
    units: { y: 'h', y1: 'h', datasets: ['h', 'h'] }
  }),
  endpointPreset({
    id: 'system-planned-vs-completed-load',
    name: 'Planned vs Completed Load',
    description: 'Compare planned versus delivered TSS across each training week.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/planned-vs-completed',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'load' },
    units: { y: 'tss', y1: 'tss', datasets: ['tss', 'tss'] }
  }),
  endpointPreset({
    id: 'system-adherence-trend',
    name: 'Adherence Trend',
    description: 'Track weekly completion percentage against the plan.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'adherence-trend' },
    units: { y: '%' }
  }),
  endpointPreset({
    id: 'system-weekly-completion-rate',
    name: 'Weekly Completion Rate',
    description: 'See the share of planned sessions completed each week.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-completion-rate' },
    units: { y: '%' }
  }),
  endpointPreset({
    id: 'system-hrv-recovery',
    name: 'HRV vs Recovery',
    description: 'Plot HRV against recovery to find your personal response pattern.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'hrv-recovery' },
    units: { x: 'ms', y: '%' }
  }),
  endpointPreset({
    id: 'system-readiness-performance',
    name: 'Readiness vs Performance',
    description: 'Compare readiness on the day with the load you were able to express.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'readiness-performance' },
    units: { x: '%', y: 'score' }
  }),
  endpointPreset({
    id: 'system-sleep-recovery',
    name: 'Sleep vs Recovery',
    description: 'Spot how sleep duration aligns with your recovery state.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'sleep-recovery' },
    units: { x: 'h', y: '%' }
  }),
  endpointPreset({
    id: 'system-wellness-load-correlation',
    name: 'Wellness vs Load',
    description: 'Compare subjective recovery and the load you completed.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'wellness-load' },
    units: { x: '%', y: 'tss' }
  }),
  endpointPreset({
    id: 'system-power-duration-curve',
    name: 'Power Duration Curve',
    description: 'View your best average power across key durations.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'power-duration-curve' },
    units: { x: 's', y: 'W' }
  }),
  endpointPreset({
    id: 'system-peak-power-trend',
    name: 'Peak Power Trend (5 min)',
    description: 'Track weekly best 5-minute power to understand aerobic peak progression.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'peak-power-trend', durationSec: 300 },
    units: { y: 'W' }
  }),
  endpointPreset({
    id: 'system-roster-fatigue-heatmap',
    name: 'Roster Fatigue Heatmap',
    description: 'Visualize TSB across athletes and dates to surface fatigue risk quickly.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'team',
    visualType: 'heatmap',
    requiredCapabilities: ['heatmap'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/team-heatmap',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'fatigue' },
    units: { y: 'load' }
  }),
  endpointPreset({
    id: 'system-roster-recovery-heatmap',
    name: 'Roster Recovery Heatmap',
    description: 'Track who is fresh, strained, or under pressure across the roster.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'team',
    visualType: 'heatmap',
    requiredCapabilities: ['heatmap'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/team-heatmap',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'recovery' },
    units: { y: '%' }
  }),
  endpointPreset({
    id: 'system-team-load-comparison',
    name: 'Team Load Comparison',
    description: 'Compare weekly load trends across the selected roster or group.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'team',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/team-comparison',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'load' },
    units: { y: 'tss' }
  }),
  endpointPreset({
    id: 'system-team-ctl-comparison',
    name: 'Team CTL Comparison',
    description: 'Compare fitness trends across athletes inside the same scope.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'team',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/team-comparison',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'ctl' },
    units: { y: 'load' }
  }),
  endpointPreset({
    id: 'system-team-compliance-comparison',
    name: 'Team Compliance Comparison',
    description: 'Compare adherence percentages across athletes.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'team',
    visualType: 'horizontalBar',
    requiredCapabilities: ['horizontalBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/team-comparison',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'compliance' },
    units: { x: '%' }
  }),
  endpointPreset({
    id: 'system-athlete-group-comparison',
    name: 'Athlete Group Comparison',
    description: 'Compare weekly load patterns for the selected athlete group.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'athlete_group',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/team-comparison',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'group-comparison' },
    units: { y: 'tss' }
  })
]
