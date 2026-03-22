export type WorkoutComparisonCategory =
  | 'summary'
  | 'streams'
  | 'intervals'
  | 'power'
  | 'efficiency'
  | 'benchmarking'

export type WorkoutComparisonMode = 'summary' | 'stream' | 'interval'

export interface WorkoutComparisonPreset {
  id: string
  name: string
  description: string
  category: WorkoutComparisonCategory
  mode: WorkoutComparisonMode
  visualType: 'line' | 'bar' | 'scatter'
  insightCopy: string
  flagship?: boolean
  sourceLabel: 'Workout Metrics' | 'Workout Streams' | 'Workout Splits'
  summary?: {
    chartType: 'bar' | 'scatter' | 'line'
    sortMode: 'selected_order' | 'chronological' | 'metric_desc'
    primaryMetric: string
    secondaryMetric?: string
  }
  stream?: {
    field: 'watts' | 'heartrate' | 'cadence' | 'velocity' | 'altitude' | 'grade'
    alignment: 'elapsed_time' | 'distance' | 'percent_complete'
  }
  interval?: {
    field: 'avgPower' | 'avgHr' | 'duration' | 'distance'
  }
}

export const WORKOUT_COMPARISON_CATEGORIES: Array<{
  label: string
  value: WorkoutComparisonCategory
}> = [
  { label: 'Summary', value: 'summary' },
  { label: 'Streams', value: 'streams' },
  { label: 'Intervals', value: 'intervals' },
  { label: 'Power', value: 'power' },
  { label: 'Efficiency', value: 'efficiency' },
  { label: 'Benchmarking', value: 'benchmarking' }
]

export const WORKOUT_COMPARISON_PRESETS: WorkoutComparisonPreset[] = [
  {
    id: 'threshold-progression',
    name: 'Threshold Progression',
    description: 'Track threshold-oriented workout quality across selected sessions.',
    category: 'power',
    mode: 'summary',
    visualType: 'bar',
    flagship: true,
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'chronological',
      primaryMetric: 'normalizedPower',
      secondaryMetric: 'tss'
    },
    insightCopy:
      'Use this to see whether repeat threshold sessions are getting faster, stronger, or simply more costly.'
  },
  {
    id: 'normalized-power-benchmark',
    name: 'Normalized Power Benchmark',
    description: 'Rank the selected sessions by normalized power with training load context.',
    category: 'power',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'metric_desc',
      primaryMetric: 'normalizedPower',
      secondaryMetric: 'trainingLoad'
    },
    insightCopy:
      'This is a strong coach-facing view for seeing which sessions truly demanded the most sustained power, not just the highest headline load.'
  },
  {
    id: 'power-vs-heart-rate',
    name: 'Power vs Heart Rate',
    description: 'Compare average power against average heart rate across selected workouts.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'averageWatts',
      secondaryMetric: 'averageHr'
    },
    insightCopy:
      'Use this to compare how much cardiovascular cost each workout required for the achieved output.'
  },
  {
    id: 'efficiency-comparison',
    name: 'Efficiency Comparison',
    description: 'Compare efficiency factor against decoupling for steady-state rides.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'scatter',
    flagship: true,
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'efficiencyFactor',
      secondaryMetric: 'decoupling'
    },
    insightCopy:
      'This preset helps answer whether the athlete is sustaining output efficiently or paying more cardiovascular cost for similar work.'
  },
  {
    id: 'cardiac-drift-check',
    name: 'Cardiac Drift Check',
    description: 'Compare decoupling against efficiency factor to spot aerobic stability issues.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'decoupling',
      secondaryMetric: 'efficiencyFactor'
    },
    insightCopy:
      'This is useful for long steady work where you want to see whether the athlete is drifting more even when the output looks similar.'
  },
  {
    id: 'power-heart-ratio-benchmark',
    name: 'Power / HR Ratio',
    description: 'Rank sessions by power-to-heart-rate ratio to compare economy across workouts.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'metric_desc',
      primaryMetric: 'powerHrRatio',
      secondaryMetric: 'averageWatts'
    },
    insightCopy:
      'This preset is useful when you want one simple ranking of how much output the athlete produced for the heart-rate cost.'
  },
  {
    id: 'recovery-ride-correlation',
    name: 'Recovery Ride Correlation',
    description: 'Use average heart rate and power together to compare low-intensity execution.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'averageHr',
      secondaryMetric: 'averageWatts'
    },
    insightCopy:
      'This is useful for checking whether easy rides are staying truly easy or drifting upward in effort for the same output.'
  },
  {
    id: 'intensity-vs-load',
    name: 'Intensity vs Load',
    description:
      'Compare workout intensity against total load to separate hard-short from big-long sessions.',
    category: 'summary',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'intensity',
      secondaryMetric: 'trainingLoad'
    },
    insightCopy:
      'Use this when the coaching question is whether the athlete is accumulating load through intensity, volume, or both.'
  },
  {
    id: 'squad-benchmark',
    name: 'Squad Benchmark',
    description: 'Use training load as the anchor ranking metric for the selected sessions.',
    category: 'benchmarking',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'metric_desc',
      primaryMetric: 'trainingLoad',
      secondaryMetric: 'tss'
    },
    insightCopy:
      'This chart is best for quick coach-facing comparisons when the same kind of session has been completed by multiple athletes.'
  },
  {
    id: 'training-load-comparison',
    name: 'Training Load Comparison',
    description: 'Compare TSS and training load across the selected workouts.',
    category: 'summary',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'selected_order',
      primaryMetric: 'trainingLoad',
      secondaryMetric: 'tss'
    },
    insightCopy:
      'This is the simplest way to compare how costly each workout was without needing to inspect raw streams.'
  },
  {
    id: 'duration-vs-distance',
    name: 'Duration vs Distance',
    description: 'Compare how long each session took relative to the total distance covered.',
    category: 'summary',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'durationSec',
      secondaryMetric: 'distanceMeters'
    },
    insightCopy:
      'This is a quick way to compare pacing and route demand when the sessions are broadly similar but not identical.'
  },
  {
    id: 'calories-vs-load',
    name: 'Calories vs Load',
    description: 'See whether higher-energy sessions were also the biggest training stressors.',
    category: 'summary',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'calories',
      secondaryMetric: 'trainingLoad'
    },
    insightCopy:
      'This chart helps connect fueling demand and session cost, especially when comparing mixed ride and run workloads.'
  },
  {
    id: 'kilojoule-comparison',
    name: 'Kilojoule Comparison',
    description: 'Compare total work done in kilojoules with training load as supporting context.',
    category: 'power',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'metric_desc',
      primaryMetric: 'kilojoules',
      secondaryMetric: 'trainingLoad'
    },
    insightCopy:
      'Use this to compare how much actual mechanical work was done, especially when long endurance sessions need to be ranked quickly.'
  },
  {
    id: 'work-above-threshold',
    name: 'Work Above Threshold',
    description: 'Compare how much work each session accumulated above FTP.',
    category: 'power',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'bar',
      sortMode: 'metric_desc',
      primaryMetric: 'workAboveFtp',
      secondaryMetric: 'normalizedPower'
    },
    insightCopy:
      'This is a useful quality-session view when you care more about hard work accumulated than about total session duration.'
  },
  {
    id: 'trimp-vs-hr-load',
    name: 'TRIMP vs HR Load',
    description: 'Compare two heart-rate-driven load models across the selected sessions.',
    category: 'benchmarking',
    mode: 'summary',
    visualType: 'scatter',
    sourceLabel: 'Workout Metrics',
    summary: {
      chartType: 'scatter',
      sortMode: 'selected_order',
      primaryMetric: 'trimp',
      secondaryMetric: 'hrLoad'
    },
    insightCopy:
      'This preset is useful when you want to compare sessions primarily through heart-rate cost rather than power-derived stress.'
  },
  {
    id: 'power-overlay',
    name: 'Power Overlay',
    description: 'Overlay power traces across selected workouts with aligned pacing context.',
    category: 'power',
    mode: 'stream',
    visualType: 'line',
    flagship: true,
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'watts',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'Use this when you want to see whether the workout shape was actually similar, not just the final summary metrics.'
  },
  {
    id: 'power-distance-overlay',
    name: 'Power by Distance',
    description:
      'Overlay power traces aligned by distance to compare pacing across routes or repeated segments.',
    category: 'power',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'watts',
      alignment: 'distance'
    },
    insightCopy:
      'This works best when sessions share route shape or workout structure and you want to compare where effort really changed.'
  },
  {
    id: 'heart-rate-overlay',
    name: 'Heart Rate Overlay',
    description: 'Compare heart rate traces across workouts to see how the body responded.',
    category: 'streams',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'heartrate',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'Heart rate overlays are useful for seeing whether the athlete is stabilizing, drifting, or accumulating strain differently between sessions.'
  },
  {
    id: 'heart-rate-percent-overlay',
    name: 'Heart Rate by Completion',
    description: 'Compare heart-rate response normalized to workout completion percentage.',
    category: 'streams',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'heartrate',
      alignment: 'percent_complete'
    },
    insightCopy:
      'This makes it easier to compare workouts of different absolute duration while still seeing where the body started to drift.'
  },
  {
    id: 'cadence-overlay',
    name: 'Cadence Overlay',
    description: 'Overlay cadence traces to compare rhythm and execution across sessions.',
    category: 'streams',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'cadence',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'Cadence overlays help identify execution differences that summary metrics often hide, especially in repeated structured work.'
  },
  {
    id: 'speed-overlay',
    name: 'Speed Overlay',
    description: 'Overlay speed traces across workouts to compare pacing and terrain response.',
    category: 'streams',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'velocity',
      alignment: 'distance'
    },
    insightCopy:
      'Use this when route shape matters and you want to see whether the athlete held speed differently through the same terrain.'
  },
  {
    id: 'altitude-profile-overlay',
    name: 'Altitude Profile Overlay',
    description: 'Compare altitude traces aligned by distance for route and climb context.',
    category: 'power',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'altitude',
      alignment: 'distance'
    },
    insightCopy:
      'This gives coaches route context before interpreting power, heart rate, or speed overlays on repeated outdoor sessions.'
  },
  {
    id: 'grade-overlay',
    name: 'Grade Overlay',
    description: 'Overlay grade percentage by distance to compare terrain demands across sessions.',
    category: 'streams',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'grade',
      alignment: 'distance'
    },
    insightCopy:
      'Grade overlays help explain why seemingly similar outdoor workouts produced different power, speed, or heart-rate patterns.'
  },
  {
    id: 'interval-power-comparison',
    name: 'Interval Power Comparison',
    description: 'Compare lap or interval average power across the selected workouts.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    flagship: true,
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'avgPower'
    },
    insightCopy:
      'Use this to see whether repeated interval sessions are becoming more stable, fading less, or producing stronger split-level output.'
  },
  {
    id: 'interval-hr-comparison',
    name: 'Interval HR Comparison',
    description: 'Compare split-level heart rate responses across selected workouts.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'avgHr'
    },
    insightCopy:
      'This chart helps you see whether similar intervals are becoming cheaper or more taxing from a heart-rate perspective.'
  },
  {
    id: 'interval-power-vs-hr',
    name: 'Interval Power vs HR',
    description:
      'Compare split-level power and heart-rate response together across repeated workouts.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'avgPower'
    },
    insightCopy:
      'Use this alongside advanced metric overrides when you want to inspect whether interval power is improving without a matching rise in heart-rate cost.'
  },
  {
    id: 'split-duration-comparison',
    name: 'Split Duration Comparison',
    description: 'Compare lap or interval durations across selected workouts.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'duration'
    },
    insightCopy:
      'Duration comparison is useful when the structure itself changes or when you want to check consistency in repeated split execution.'
  },
  {
    id: 'split-distance-comparison',
    name: 'Split Distance Comparison',
    description: 'Compare lap or split distances across selected workouts.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'distance'
    },
    insightCopy:
      'Distance comparison works best when the workout structure or route segmentation is meaningful and stable across sessions.'
  },
  {
    id: 'interval-duration-consistency',
    name: 'Interval Duration Consistency',
    description: 'Check whether split durations stay stable across repeated structured sessions.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'duration'
    },
    insightCopy:
      'This is a useful consistency chart when the athlete is repeating the same workout prescription and timing should remain stable.'
  },
  {
    id: 'interval-distance-consistency',
    name: 'Interval Distance Consistency',
    description:
      'Compare split distances to see whether intervals covered similar ground each time.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Splits',
    interval: {
      field: 'distance'
    },
    insightCopy:
      'Use this when route, lap, or interval distance is meaningful and you want to inspect repeatability across sessions or athletes.'
  }
]

export function findWorkoutComparisonPresetById(id?: string | null) {
  if (!id) return null
  return WORKOUT_COMPARISON_PRESETS.find((preset) => preset.id === id) || null
}
