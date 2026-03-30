export type AnalyticsPresetCategory =
  | 'performance'
  | 'recovery'
  | 'nutrition'
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

export type AnalyticsOverlayType =
  | 'rollingAverage'
  | 'baselineBand'
  | 'targetLine'
  | 'previousPeriod'
  | 'squadAverage'
  | 'thresholdLine'
  | 'regressionLine'
  | 'wellnessEvents'

export interface AnalyticsOverlayOption {
  id: string
  label: string
  type: AnalyticsOverlayType
  description?: string
  datasetIndex?: number
  window?: number
  value?: number
  axis?: 'x' | 'y' | 'y1'
  color?: string
}

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
  settings?: {
    smooth?: boolean
    yScale?: 'dynamic' | 'fixed'
    yMin?: number
    showDelta?: boolean
    showRegression?: boolean
    showPoints?: boolean
    opacity?: number
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
  defaultOverlays?: string[]
  availableOverlays?: AnalyticsOverlayOption[]
  supportsCompareOverlay?: boolean
  compareOverlayMode?: 'squadAverage' | 'median' | 'none'
  insightCopy?: string
  flagship?: boolean
  displayNameOverride?: string
}

const rolling7d: AnalyticsOverlayOption = {
  id: 'rolling-7d',
  label: '7D Avg',
  type: 'rollingAverage',
  window: 7,
  description: 'Smooth short-term day-to-day noise.'
}

const rolling30d: AnalyticsOverlayOption = {
  id: 'rolling-30d',
  label: '30D Avg',
  type: 'rollingAverage',
  window: 30,
  description: 'Highlight longer trend direction.'
}

const baselineBand: AnalyticsOverlayOption = {
  id: 'baseline-band',
  label: 'Baseline Band',
  type: 'baselineBand',
  description: 'Show the athlete normal range around the primary trend.'
}

const previousPeriod: AnalyticsOverlayOption = {
  id: 'previous-period',
  label: 'Prior Period',
  type: 'previousPeriod',
  description: 'Overlay the immediately preceding time block.'
}

const squadAverage: AnalyticsOverlayOption = {
  id: 'squad-average',
  label: 'Squad Average',
  type: 'squadAverage',
  description: 'Compare selected athletes to the cohort average.'
}

const regressionLine: AnalyticsOverlayOption = {
  id: 'regression-line',
  label: 'Trendline',
  type: 'regressionLine',
  description: 'Add a best-fit line to reveal the overall relationship.'
}

const wellnessEvents: AnalyticsOverlayOption = {
  id: 'wellness-events',
  label: 'Context Events',
  type: 'wellnessEvents',
  description: 'Mark illness, travel, tags, and recovery context on the timeline.'
}

function targetLine(
  id: string,
  label: string,
  value: number,
  color = '#10b981',
  description?: string
): AnalyticsOverlayOption {
  return {
    id,
    label,
    type: 'targetLine',
    value,
    color,
    description
  }
}

function thresholdLine(
  id: string,
  label: string,
  value: number,
  color = '#f59e0b',
  description?: string
): AnalyticsOverlayOption {
  return {
    id,
    label,
    type: 'thresholdLine',
    value,
    color,
    description
  }
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
  } as AnalyticsSystemPreset
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
  } as AnalyticsSystemPreset
}

export const ANALYTICS_PRESET_CATEGORIES: Array<{ label: string; value: AnalyticsPresetCategory }> =
  [
    { label: 'Performance', value: 'performance' },
    { label: 'Recovery', value: 'recovery' },
    { label: 'Nutrition', value: 'nutrition' },
    { label: 'Distribution', value: 'distribution' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Correlation', value: 'correlation' },
    { label: 'Team', value: 'team' }
  ]

export const ANALYTICS_SYSTEM_PRESETS: AnalyticsSystemPreset[] = [
  queryPreset({
    id: 'system-pmc',
    name: 'Performance Management (PMC)',
    description:
      'Track fitness, fatigue, and form together to understand where the athlete sits in the training cycle.',
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
    styling: { showLegend: true },
    flagship: true,
    insightCopy:
      'Use PMC to balance long-term fitness gains against short-term fatigue so you can spot productive overload versus risky strain.',
    defaultOverlays: ['previous-period'],
    availableOverlays: [previousPeriod]
  }),
  queryPreset({
    id: 'system-weekly-tss',
    name: 'Weekly Load Trend',
    description:
      'Answer the coaching question: is load building, flattening, or spiking week to week?',
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
    styling: { showLegend: true },
    flagship: true,
    insightCopy:
      'This is the anchor trend for monitoring weekly stress. Sudden jumps matter more than isolated big weeks.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d, rolling30d, squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
  }),
  queryPreset({
    id: 'system-weekly-volume',
    name: 'Weekly Volume Trend',
    description: 'Track how much time the athlete is actually spending training each week.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [{ field: 'durationSec', aggregation: 'sum' }],
    units: { y: 'duration' },
    insightCopy:
      'Use volume alongside load to separate longer easy weeks from shorter high-intensity blocks.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d, rolling30d, squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
  }),
  queryPreset({
    id: 'system-load-vs-volume',
    name: 'Load vs Volume',
    description:
      'See whether training stress is being driven by more time, more intensity, or both.',
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
    },
    insightCopy:
      'When load rises faster than volume, intensity is doing more of the work. When both rise together, overall training demand is climbing.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d, previousPeriod]
  }),
  queryPreset({
    id: 'system-recovery-trajectory',
    name: 'Recovery Trajectory',
    description:
      'Track the athlete recovery signal over time and distinguish noise from a real shift.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'recoveryScore', aggregation: 'avg' }],
    units: { y: '%' },
    flagship: true,
    insightCopy:
      'Recovery is most useful in context. The baseline band helps show whether today is normal or a genuine dip.',
    defaultOverlays: ['rolling-7d', 'baseline-band'],
    availableOverlays: [rolling7d, baselineBand, wellnessEvents]
  }),
  queryPreset({
    id: 'system-calories-vs-goal',
    name: 'Calories vs Goal',
    description:
      'Compare logged calories with the athlete daily calorie target to spot under- or over-fueling.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'calories', aggregation: 'avg' },
      { field: 'caloriesGoal', aggregation: 'avg' }
    ],
    units: { y: 'kcal', y1: 'kcal', datasets: ['kcal', 'kcal'] },
    styling: {
      showLegend: true,
      datasetTypes: ['bar', 'line']
    },
    flagship: true,
    insightCopy:
      'This is the simplest way to see whether daily fueling is actually matching the intended energy target.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d]
  }),
  queryPreset({
    id: 'system-carbs-vs-goal',
    name: 'Carbs vs Goal',
    description:
      'Track carbohydrate intake against the athlete daily target to catch missed fueling support on key days.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'carbs', aggregation: 'avg' },
      { field: 'carbsGoal', aggregation: 'avg' }
    ],
    units: { y: 'g', y1: 'g', datasets: ['g', 'g'] },
    styling: {
      showLegend: true,
      datasetTypes: ['bar', 'line']
    },
    insightCopy:
      'Carb target misses matter most on higher-demand days, so this chart is useful for checking whether the athlete is actually supporting the work.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d]
  }),
  queryPreset({
    id: 'system-protein-vs-goal',
    name: 'Protein vs Goal',
    description:
      'Compare protein intake with the athlete daily target to monitor recovery-supporting intake consistency.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'protein', aggregation: 'avg' },
      { field: 'proteinGoal', aggregation: 'avg' }
    ],
    units: { y: 'g', y1: 'g', datasets: ['g', 'g'] },
    styling: {
      showLegend: true,
      datasetTypes: ['bar', 'line']
    },
    insightCopy:
      'Protein is a consistency metric more than a one-day metric, so the trend is often more useful than isolated misses.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d]
  }),
  queryPreset({
    id: 'system-hydration-trend',
    name: 'Hydration Trend',
    description:
      'Track daily fluid intake across the current block and look for chronic low-hydration days.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'waterMl', aggregation: 'avg' }],
    units: { y: 'ml' },
    insightCopy:
      'Hydration trends are more useful for spotting patterns than for overreacting to a single missed day.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d]
  }),
  queryPreset({
    id: 'system-macro-split',
    name: 'Macro Split Trend',
    description:
      'Compare carbs, protein, and fat over time to see how the athlete intake mix is shifting.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'carbs', aggregation: 'avg' },
      { field: 'protein', aggregation: 'avg' },
      { field: 'fat', aggregation: 'avg' }
    ],
    units: { y: 'g', datasets: ['g', 'g', 'g'] },
    insightCopy:
      'This chart shows whether the athlete intake mix is drifting toward higher carbs, lower carbs, or unstable distribution over the block.'
  }),
  queryPreset({
    id: 'system-nutrition-quality-trend',
    name: 'Nutrition Quality Trend',
    description:
      'Track overall nutrition quality scores over time to spot stronger or weaker fueling habits.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'overallScore', aggregation: 'avg' }],
    units: { y: 'score' },
    insightCopy:
      'Use this as a summary behavior signal rather than a precision metric. It works best for spotting drift and consistency.'
  }),
  queryPreset({
    id: 'system-glycogen-trend',
    name: 'Fuel Reserve Trend',
    description:
      'Track starting and ending glycogen percentages to see how well the athlete is carrying fuel through each day.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'nutrition',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'startingGlycogenPercentage', aggregation: 'avg' },
      { field: 'endingGlycogenPercentage', aggregation: 'avg' }
    ],
    units: { y: '%', y1: '%', datasets: ['%', '%'] },
    styling: {
      showLegend: true,
      datasetTypes: ['line', 'line']
    },
    flagship: true,
    insightCopy:
      'This chart gives a higher-level view of whether the athlete is beginning and ending the day in a sustainably fueled state.',
    defaultOverlays: ['baseline-band'],
    availableOverlays: [rolling7d, baselineBand]
  }),
  queryPreset({
    id: 'system-hrv-trend',
    name: 'HRV Trend',
    description:
      'Monitor HRV against a moving baseline instead of reacting to one-off daily noise.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'hrv', aggregation: 'avg' }],
    units: { y: 'ms' },
    flagship: true,
    insightCopy:
      'HRV matters most when it drifts away from the athlete own baseline, not when it moves slightly day to day.',
    defaultOverlays: ['baseline-band'],
    availableOverlays: [rolling7d, baselineBand, wellnessEvents]
  }),
  queryPreset({
    id: 'system-resting-hr',
    name: 'Resting HR Trend',
    description:
      'Follow resting heart rate shifts that often flag fatigue, illness, or emerging recovery strain.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'restingHr', aggregation: 'avg' }],
    units: { y: 'bpm' },
    insightCopy:
      'Resting HR is more actionable when viewed against the athlete recent normal range than as isolated numbers.',
    defaultOverlays: ['baseline-band'],
    availableOverlays: [rolling7d, baselineBand, wellnessEvents]
  }),
  queryPreset({
    id: 'system-sleep-duration',
    name: 'Sleep Duration',
    description:
      'Track nightly sleep duration against a simple target and spot sustained short-sleep blocks.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'sleepHours', aggregation: 'avg' }],
    units: { y: 'h' },
    insightCopy:
      'Sleep is most useful when you can compare actual duration with the athlete normal target and recent trend.',
    defaultOverlays: ['sleep-target'],
    availableOverlays: [
      rolling7d,
      previousPeriod,
      targetLine('sleep-target', '8h Target', 8, '#3b82f6', 'Reference sleep goal.')
    ]
  }),
  queryPreset({
    id: 'system-readiness-estimate',
    name: 'Readiness Estimate',
    description:
      'Use the readiness signal as a coaching-friendly summary of how prepared the athlete is to absorb work.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'recoveryScore', aggregation: 'avg' }],
    units: { y: '%' },
    insightCopy:
      'Readiness should answer a different question than recovery: how prepared is the athlete to express quality work right now?',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d, baselineBand]
  }),
  queryPreset({
    id: 'system-weight-trend',
    name: 'Body Mass Trend',
    description: 'Track body-mass changes without overreacting to single-day fluctuations.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'daily',
    metrics: [{ field: 'weight', aggregation: 'avg' }],
    units: { y: 'kg' },
    insightCopy:
      'Weight is easier to interpret as a smoothed trend than as a single daily reading.',
    defaultOverlays: ['rolling-7d'],
    availableOverlays: [rolling7d, rolling30d]
  }),
  endpointPreset({
    id: 'system-blood-pressure',
    name: 'Blood Pressure Health Trend',
    description:
      'Monitor systolic and diastolic trends against simple health reference thresholds.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'blood-pressure-trend' },
    units: { y: 'mmHg', datasets: ['mmHg', 'mmHg'] },
    insightCopy:
      'This is a monitoring chart rather than a training-performance chart, so threshold references matter more than small day-to-day changes.',
    defaultOverlays: ['bp-systolic-threshold', 'bp-diastolic-threshold'],
    availableOverlays: [
      thresholdLine('bp-systolic-threshold', 'Systolic Ref', 120, '#ef4444'),
      thresholdLine('bp-diastolic-threshold', 'Diastolic Ref', 80, '#f97316')
    ]
  }),
  endpointPreset({
    id: 'system-weekly-power-zones',
    name: 'Weekly Power Zone Distribution',
    description:
      'See how weekly power-zone distribution is shifting across easy, moderate, and hard work.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-power-zones' },
    units: { y: 'h' },
    insightCopy:
      'Zone distribution is most useful for checking whether the block is staying polarized, threshold-heavy, or drifting off plan.'
  }),
  endpointPreset({
    id: 'system-weekly-hr-zones',
    name: 'Weekly Heart Rate Zone Distribution',
    description:
      'Track heart-rate-based intensity distribution to check how hard the athlete is really working each week.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-hr-zones' },
    units: { y: 'h' },
    insightCopy:
      'HR zones give a physiological view of intensity distribution that can differ from power, especially under fatigue or heat.'
  }),
  endpointPreset({
    id: 'system-hr-zone-time',
    name: 'Time in HR Zones',
    description:
      'Track the total time spent in each heart rate zone per week to monitor high-intensity volume.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-hr-zones', output: 'absolute' },
    units: { y: 'h' },
    insightCopy:
      'While percentage distribution shows the mix, absolute time shows the real volume of strain being applied to the aerobic system.'
  }),
  endpointPreset({
    id: 'system-weekly-pace-zones',
    name: 'Weekly Pace Zone Distribution',
    description:
      'See how weekly running time is distributed across pace-based zones from recovery to sprint.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'stackedBar',
    requiredCapabilities: ['stackedBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-pace-zones' },
    units: { y: 'h' },
    insightCopy:
      'Pace zones are the runners primary distribution metric, showing whether the training block is building speed, endurance, or maintenance.'
  }),
  endpointPreset({
    id: 'system-aerobic-decoupling',
    name: 'Aerobic Decoupling Trend',
    description:
      'Track Pa:Hr (Pace to Heart Rate) or Pw:Hr (Power to Heart Rate) decoupling to monitor aerobic efficiency gains.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'aerobic-decoupling' },
    units: { y: '%' },
    insightCopy:
      'Lower decoupling over time indicate building aerobic efficiency. A sudden spike can flag fatigue, heat stress, or incoming illness.',
    defaultOverlays: ['rolling-7d', 'baseline-band'],
    availableOverlays: [rolling7d, baselineBand]
  }),
  endpointPreset({
    id: 'system-macro-delta',
    name: 'Macro Accuracy (Delta to Goal)',
    description:
      'Visualize the gap between actual macro intake and the daily target to fine-tune fueling precision.',
    category: 'nutrition',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'nutrition',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'macro-accuracy-delta' },
    units: { y: 'g' },
    insightCopy:
      'This chart makes it obvious when you are consistently missing specific targets, allowing for surgical adjustments to your meal planning.'
  }),
  endpointPreset({
    id: 'system-acwr-trend',
    name: 'Training Load Balance (ACWR)',
    description:
      'Monitor the Acute:Chronic Workload Ratio to keep training stress within the productive "sweet spot" and minimize injury risk.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'acwr' },
    units: { y: 'ratio' },
    insightCopy:
      'An ACWR between 0.8 and 1.3 is generally considered the sweet spot. Ratios above 1.5 indicate rapidly increasing injury risk.',
    defaultOverlays: ['acwr-sweet-spot'],
    availableOverlays: [
      baselineBand,
      thresholdLine('acwr-sweet-spot', 'Sweet Spot (1.3)', 1.3, '#10b981'),
      thresholdLine('acwr-danger-zone', 'Danger Zone (1.5)', 1.5, '#ef4444')
    ]
  }),
  endpointPreset({
    id: 'system-threshold-exposure',
    name: 'Threshold Exposure Trend',
    description:
      'Track how much time the athlete is spending at or above threshold from week to week.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'time-above-threshold' },
    units: { y: 'h' },
    insightCopy:
      'Threshold work tends to cluster inside specific blocks, so prior-period context is useful for checking progression.',
    defaultOverlays: ['previous-period'],
    availableOverlays: [previousPeriod]
  }),
  endpointPreset({
    id: 'system-session-density',
    name: 'Training Frequency',
    displayNameOverride: 'Training Frequency',
    description: 'Count how many completed sessions the athlete is stacking each week.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'session-density' },
    units: { y: 'sessions' },
    insightCopy:
      'Use this to see whether consistency is coming from more training days or just larger single days.',
    defaultOverlays: ['rolling-30d'],
    availableOverlays: [rolling30d]
  }),
  endpointPreset({
    id: 'system-discipline-mix',
    name: 'Discipline Mix',
    description:
      'Break down recent training time by discipline to check whether the block matches intent.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'horizontalBar',
    requiredCapabilities: ['horizontalBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'discipline-mix' },
    units: { x: 'h' },
    insightCopy:
      'This mix chart is best used to validate whether the athlete time allocation matches the block design.'
  }),
  endpointPreset({
    id: 'system-workout-type-distribution',
    name: 'Workout Intent Mix',
    displayNameOverride: 'Workout Intent Mix',
    description:
      'See how recent sessions are distributed across workout categories and training intent.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'horizontalBar',
    requiredCapabilities: ['horizontalBar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'workout-type-distribution' },
    units: { x: 'sessions' },
    insightCopy:
      'This chart is strongest when the workout taxonomy is clean enough to reflect real training intent.'
  }),
  endpointPreset({
    id: 'system-planned-vs-completed-volume',
    name: 'Planned vs Completed Volume',
    description:
      'Compare planned versus completed duration to see whether the athlete is matching the intended volume.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/planned-vs-completed',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'volume' },
    units: { y: 'h', y1: 'h', datasets: ['h', 'h'] },
    insightCopy:
      'Use planned versus completed volume to spot when execution is missing the intended volume target, not just the session count.'
  }),
  endpointPreset({
    id: 'system-planned-vs-completed-load',
    name: 'Planned vs Completed Load',
    description:
      'Compare planned versus delivered load across each training week to reveal execution drift.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/planned-vs-completed',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'load' },
    units: { y: 'tss', y1: 'tss', datasets: ['tss', 'tss'] },
    insightCopy:
      'This is the cleanest chart for spotting athletes who are consistently underdelivering or overshooting the intended stress.'
  }),
  endpointPreset({
    id: 'system-adherence-trend',
    name: 'Adherence Trend',
    description: 'Track weekly completion percentage against the coaching target.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'adherence-trend' },
    units: { y: '%' },
    insightCopy:
      'Adherence should be read against a target line so you can tell acceptable execution apart from a real compliance issue.',
    defaultOverlays: ['adherence-target'],
    availableOverlays: [
      targetLine('adherence-target', '85% Target', 85, '#10b981', 'Target adherence threshold.')
    ]
  }),
  endpointPreset({
    id: 'system-weekly-completion-rate',
    name: 'Weekly Completion Rate',
    description:
      'See the share of planned sessions completed each week, with cohort context when comparing athletes.',
    category: 'compliance',
    audience: 'coach',
    recommendedScope: 'athlete',
    visualType: 'bar',
    requiredCapabilities: ['bar'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'weekly-completion-rate' },
    units: { y: '%' },
    insightCopy:
      'This chart works best in compare mode, where the athlete can be read against the squad average rather than in isolation.',
    defaultOverlays: ['squad-average'],
    availableOverlays: [squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
  }),
  endpointPreset({
    id: 'system-hrv-recovery',
    name: 'HRV vs Recovery',
    description:
      'Plot HRV against recovery to see whether higher variability aligns with better readiness for this athlete.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'hrv-recovery' },
    units: { x: 'ms', y: '%' },
    insightCopy:
      'Scatter plots become useful once you add a trendline and enough points to see whether the relationship is directional or noisy.',
    defaultOverlays: ['regression-line'],
    availableOverlays: [regressionLine]
  }),
  endpointPreset({
    id: 'system-readiness-performance',
    name: 'Readiness vs Performance',
    description:
      'Compare readiness on the day with the performance or load the athlete was able to express.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'readiness-performance' },
    units: { x: '%', y: 'score' },
    insightCopy:
      'This relationship is rarely perfect, but a trendline helps you see whether readiness is directionally predictive for this athlete.',
    defaultOverlays: ['regression-line'],
    availableOverlays: [regressionLine]
  }),
  endpointPreset({
    id: 'system-sleep-recovery',
    name: 'Sleep vs Recovery',
    description:
      'Spot whether more sleep is actually translating into higher recovery for this athlete.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'sleep-recovery' },
    units: { x: 'h', y: '%' },
    insightCopy:
      'This is useful for athletes who say they feel flat despite sleeping more. The pattern may be weaker than expected.',
    defaultOverlays: ['regression-line'],
    availableOverlays: [regressionLine]
  }),
  endpointPreset({
    id: 'system-wellness-load-correlation',
    name: 'Wellness vs Load',
    description:
      'Compare subjective wellness against completed load to see how hard work is landing on the athlete.',
    category: 'correlation',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'wellness-load' },
    units: { x: '%', y: 'tss' },
    insightCopy:
      'If wellness is repeatedly low on high-load days, the athlete may be absorbing work poorly or accumulating hidden stress.',
    defaultOverlays: ['regression-line'],
    availableOverlays: [regressionLine]
  }),
  endpointPreset({
    id: 'system-power-duration-curve',
    name: 'Power Duration Curve',
    description:
      'View best average power across key durations with prior-block context for progression.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'scatter',
    requiredCapabilities: ['scatter'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'power-duration-curve' },
    units: { x: 's', y: 'W' },
    flagship: true,
    insightCopy:
      'The curve is most useful when you compare it to a prior block so you can see whether gains are short-duration, aerobic, or broad.',
    defaultOverlays: ['previous-period'],
    availableOverlays: [previousPeriod]
  }),
  endpointPreset({
    id: 'system-peak-power-trend',
    name: 'Peak Power Trend (5 min)',
    description:
      'Track weekly best 5-minute power to understand aerobic peak progression over time.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/power-duration',
    timeRange: { type: 'rolling', value: '90d' },
    presetOptions: { mode: 'peak-power-trend', durationSec: 300 },
    units: { y: 'W' },
    insightCopy:
      'This works well as a simple progression chart, especially when you compare it to the immediately preceding block.',
    defaultOverlays: ['previous-period'],
    availableOverlays: [previousPeriod]
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
    units: { y: 'load' },
    insightCopy:
      'The fatigue heatmap is a screening tool. It helps coaches spot which athletes need a closer look right now.'
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
    units: { y: '%' },
    insightCopy:
      'Use this to spot clusters of low recovery, not to overreact to isolated rough days.'
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
    units: { y: 'tss' },
    flagship: true,
    insightCopy:
      'Team load comparison is strongest when the athlete lines are read against the squad average rather than separately.',
    defaultOverlays: ['squad-average'],
    availableOverlays: [squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
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
    units: { y: 'load' },
    insightCopy:
      'CTL comparison is useful for checking who is carrying a bigger chronic load and who may be lagging behind the group.',
    defaultOverlays: ['squad-average'],
    availableOverlays: [squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
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
    units: { x: '%' },
    insightCopy:
      'A simple ranking view makes compliance issues obvious when one athlete is drifting away from the group norm.'
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
    units: { y: 'tss' },
    insightCopy:
      'This chart is best used to compare a defined cohort against the wider training plan or against another selected athlete.'
  }),
  endpointPreset({
    id: 'system-hrv-rhr-dual-axis',
    name: 'HRV + Resting HR',
    description:
      'Overlay HRV and resting heart rate to spot supportive or conflicting recovery signals.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'wellness',
    endpoint: '/api/analytics/presets/correlation',
    timeRange: { type: 'rolling', value: '30d' },
    presetOptions: { mode: 'hrv-rhr-dual-axis' },
    units: { y: 'ms', y1: 'bpm', datasets: ['ms', 'bpm'] },
    flagship: true,
    insightCopy:
      'HRV and resting HR together provide a more useful recovery picture than either signal alone.',
    defaultOverlays: ['baseline-band'],
    availableOverlays: [baselineBand, wellnessEvents]
  }),
  queryPreset({
    id: 'system-sleep-recovery-combo',
    name: 'Sleep + Recovery Combo',
    description:
      'Compare sleep duration with next-day recovery to see whether rest is translating into readiness.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'sleepHours', aggregation: 'avg' },
      { field: 'recoveryScore', aggregation: 'avg' }
    ],
    units: { y: 'h', y1: '%', datasets: ['h', '%'] },
    styling: {
      showLegend: true,
      datasetTypes: ['bar', 'line']
    },
    insightCopy:
      'This helps coaches separate a sleep problem from a broader recovery problem when the athlete looks flat.',
    defaultOverlays: ['sleep-target'],
    availableOverlays: [
      rolling7d,
      targetLine('sleep-target', '8h Target', 8, '#3b82f6', 'Reference sleep goal.')
    ]
  }),
  queryPreset({
    id: 'system-athlete-vs-squad-average',
    name: 'Athlete vs Squad Average',
    description:
      'Compare one or more selected athletes to the cohort average on the same load trend.',
    category: 'team',
    audience: 'coach',
    recommendedScope: 'athletes',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'workouts',
    timeRange: { type: 'rolling', value: '84d' },
    grouping: 'weekly',
    metrics: [{ field: 'tss', aggregation: 'sum' }],
    units: { y: 'tss' },
    insightCopy:
      'Use this when you want to know whether an athlete is sitting above, below, or right on the load pattern of the squad.',
    defaultOverlays: ['squad-average'],
    availableOverlays: [rolling7d, squadAverage],
    supportsCompareOverlay: true,
    compareOverlayMode: 'squadAverage'
  }),
  endpointPreset({
    id: 'system-prior-block-vs-current-block',
    name: 'Prior Block vs Current Block',
    description:
      'Compare the current block with the immediately prior block to see whether the athlete is progressing load cleanly.',
    category: 'performance',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '56d' },
    presetOptions: { mode: 'prior-block-vs-current-block' },
    units: { y: 'tss', y1: 'tss', datasets: ['tss', 'tss'] },
    insightCopy:
      'This is a progression view. It is best used to compare whether the athlete is repeating, absorbing, or extending the previous block.'
  }),
  endpointPreset({
    id: 'system-training-consistency',
    name: 'Training Consistency',
    description:
      'Track weekly training days and the short rolling baseline that defines current consistency.',
    category: 'distribution',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'combo',
    requiredCapabilities: ['combo'],
    source: 'workouts',
    endpoint: '/api/analytics/presets/compliance',
    timeRange: { type: 'rolling', value: '84d' },
    presetOptions: { mode: 'training-consistency' },
    units: { y: 'sessions', y1: 'sessions', datasets: ['sessions', 'sessions'] },
    insightCopy:
      'Consistency often predicts durability better than isolated big weeks, especially during return-to-train periods.'
  }),
  queryPreset({
    id: 'system-recovery-context-timeline',
    name: 'Recovery Context Timeline',
    description:
      'Review recovery score with contextual wellness events layered directly onto the timeline.',
    category: 'recovery',
    audience: 'both',
    recommendedScope: 'self',
    visualType: 'line',
    requiredCapabilities: ['line'],
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [{ field: 'recoveryScore', aggregation: 'avg' }],
    units: { y: '%' },
    insightCopy:
      'This view is designed for story-telling: how travel, sickness, or recovery tags line up with the trend the athlete is seeing.',
    defaultOverlays: ['wellness-events', 'rolling-7d'],
    availableOverlays: [wellnessEvents, rolling7d, baselineBand]
  })
]
