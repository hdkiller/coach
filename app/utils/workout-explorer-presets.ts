export type WorkoutExplorerCategory =
  | 'overview'
  | 'zones'
  | 'streams'
  | 'terrain'
  | 'intervals'
  | 'power'
  | 'efficiency'

export type WorkoutExplorerMode = 'summary' | 'stream' | 'interval' | 'density'

export interface WorkoutExplorerPreset {
  id: string
  name: string
  description: string
  category: WorkoutExplorerCategory
  mode: WorkoutExplorerMode
  visualType: 'line' | 'bar' | 'scatter' | 'map' | 'map-heatmap' | 'density-heatmap' | 'radar'
  insightCopy: string
  flagship?: boolean
  sourceLabel: 'Workout Summary' | 'Workout Streams' | 'Workout Intervals' | 'Workout Zones'
  summary?: {
    type?: 'metrics' | 'zones'
    chartType: 'bar' | 'line'
    metrics: string[]
    zoneType?: 'power' | 'hr'
  }
  stream?: {
    field:
      | 'watts'
      | 'heartrate'
      | 'cadence'
      | 'velocity'
      | 'altitude'
      | 'grade'
      | 'torque'
      | 'vam'
      | 'w_balance'
      | 'power_hr_ratio'
    alignment: 'elapsed_time' | 'distance' | 'percent_complete'
  }
  interval?: {
    field: 'avgPower' | 'avgHr' | 'duration' | 'distance'
  }
  density?: {
    xField: 'cadence' | 'heartrate' | 'velocity'
    yField: 'watts' | 'torque'
  }
  scales?: {
    x?: { type: 'linear' | 'logarithmic' | 'category' }
    y?: { type: 'linear' | 'logarithmic' }
  }
}

export const WORKOUT_EXPLORER_CATEGORIES: Array<{
  label: string
  value: WorkoutExplorerCategory
}> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Zones', value: 'zones' },
  { label: 'Streams', value: 'streams' },
  { label: 'Terrain', value: 'terrain' },
  { label: 'Intervals', value: 'intervals' },
  { label: 'Power', value: 'power' },
  { label: 'Efficiency', value: 'efficiency' }
]

export const WORKOUT_EXPLORER_PRESETS: WorkoutExplorerPreset[] = [
  {
    id: 'workout-cost-overview',
    name: 'Workout Cost Overview',
    description: 'See the headline cost metrics for a single workout in one chart.',
    category: 'overview',
    mode: 'summary',
    visualType: 'bar',
    flagship: true,
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'bar',
      metrics: ['trainingLoad', 'tss', 'kilojoules', 'calories']
    },
    insightCopy:
      'This is the quickest way to understand how expensive the session was across load, work, and fueling demand.'
  },
  {
    id: 'power-heart-rate-overview',
    name: 'Power and Heart Rate Snapshot',
    description: 'Review the core output and cardiovascular summary of the workout.',
    category: 'overview',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'bar',
      metrics: ['averageWatts', 'normalizedPower', 'averageHr', 'intensity']
    },
    insightCopy:
      'Use this when you want one compact read on output, internal load, and intensity from a single session.'
  },
  {
    id: 'power-efficiency-overview',
    name: 'Efficiency Snapshot',
    description: 'Check economy and durability markers from one workout.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'line',
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'line',
      metrics: ['efficiencyFactor', 'decoupling', 'powerHrRatio', 'variabilityIndex']
    },
    insightCopy:
      'This is useful when the coaching question is whether the athlete was efficient, steady, and aerobically durable in this session.'
  },
  {
    id: 'session-shape-overview',
    name: 'Session Shape Overview',
    description: 'Read the workout size and terrain profile at a glance.',
    category: 'overview',
    mode: 'summary',
    visualType: 'bar',
    flagship: true,
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'bar',
      metrics: ['durationSec', 'distanceMeters', 'elevationGain', 'averageSpeed']
    },
    insightCopy:
      'This is the fast overview for how long, how far, how hilly, and how quickly the session unfolded.'
  },
  {
    id: 'peak-output-overview',
    name: 'Peak Output Snapshot',
    description: 'Review top-end output and control markers from the workout.',
    category: 'power',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'bar',
      metrics: ['maxWatts', 'averageWatts', 'normalizedPower', 'variabilityIndex']
    },
    insightCopy:
      'Use this when you want to separate peak punch, sustained output, and how stochastic the session became.'
  },
  {
    id: 'cardio-load-overview',
    name: 'Cardio Load Snapshot',
    description: 'Blend heart-rate cost, ceiling, and durability markers in one view.',
    category: 'efficiency',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Summary',
    summary: {
      type: 'metrics',
      chartType: 'bar',
      metrics: ['averageHr', 'maxHr', 'trimp', 'hrLoad']
    },
    insightCopy:
      'This is useful when the coaching question is how hard the session felt internally, not just what the external output looked like.'
  },
  {
    id: 'power-zone-distribution',
    name: 'Power Zone Distribution',
    description: 'Break the workout down by time spent in each power zone.',
    category: 'zones',
    mode: 'summary',
    visualType: 'bar',
    flagship: true,
    sourceLabel: 'Workout Zones',
    summary: {
      type: 'zones',
      chartType: 'bar',
      metrics: [],
      zoneType: 'power'
    },
    insightCopy:
      'This is the go-to view for understanding where the session really lived across the athlete’s power system.'
  },
  {
    id: 'heart-rate-zone-distribution',
    name: 'Heart Rate Zone Distribution',
    description: 'Break the workout down by time spent in each heart-rate zone.',
    category: 'zones',
    mode: 'summary',
    visualType: 'bar',
    sourceLabel: 'Workout Zones',
    summary: {
      type: 'zones',
      chartType: 'bar',
      metrics: [],
      zoneType: 'hr'
    },
    insightCopy:
      'Use this when you care about how the athlete absorbed the session physiologically across the workout.'
  },
  {
    id: 'power-stream',
    name: 'Power Stream',
    description: 'Inspect the power trace across the workout timeline.',
    category: 'power',
    mode: 'stream',
    visualType: 'scatter',
    flagship: true,
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'watts',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'Use this to see how the workout was actually paced, not just what the summary metrics imply.'
  },
  {
    id: 'heart-rate-stream',
    name: 'Heart Rate Stream',
    description: 'Inspect heart rate progression across the session.',
    category: 'efficiency',
    mode: 'stream',
    visualType: 'scatter',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'heartrate',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'This helps reveal drift, recovery between efforts, and how the internal cost evolved across the workout.'
  },
  {
    id: 'cadence-stream',
    name: 'Cadence Stream',
    description: 'Inspect cadence rhythm throughout the workout.',
    category: 'streams',
    mode: 'stream',
    visualType: 'scatter',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'cadence',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'This is useful for checking whether the athlete stayed on the intended neuromuscular rhythm for the session.'
  },
  {
    id: 'altitude-profile',
    name: 'Altitude Profile',
    description: 'Inspect how altitude changed across the course of the workout.',
    category: 'terrain',
    mode: 'stream',
    visualType: 'scatter',
    flagship: true,
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'altitude',
      alignment: 'distance'
    },
    insightCopy:
      'This adds route and climbing context, which is especially helpful when output changes were terrain-driven.'
  },
  {
    id: 'grade-profile',
    name: 'Grade Profile',
    description: 'Inspect how steepness changed through the session.',
    category: 'terrain',
    mode: 'stream',
    visualType: 'scatter',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'grade',
      alignment: 'distance'
    },
    insightCopy:
      'This makes it much easier to explain surges, cadence shifts, and heart-rate changes that came from the terrain.'
  },
  {
    id: 'lap-power-profile',
    name: 'Lap Power Profile',
    description: 'Compare average power across laps or detected intervals.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    flagship: true,
    sourceLabel: 'Workout Intervals',
    interval: {
      field: 'avgPower'
    },
    insightCopy:
      'Use this for interval sessions when you want to see whether execution was consistent from rep to rep.'
  },
  {
    id: 'lap-heart-rate-profile',
    name: 'Lap Heart Rate Profile',
    description: 'Compare average heart rate across laps or detected intervals.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Intervals',
    interval: {
      field: 'avgHr'
    },
    insightCopy:
      'This makes it easier to see whether the workout got progressively costlier even if power stayed similar.'
  },
  {
    id: 'lap-duration-profile',
    name: 'Lap Duration Profile',
    description: 'Inspect how interval durations vary through the workout.',
    category: 'intervals',
    mode: 'interval',
    visualType: 'line',
    sourceLabel: 'Workout Intervals',
    interval: {
      field: 'duration'
    },
    insightCopy:
      'This is a simple structure check when the athlete performed uneven reps, mixed sets, or changing work-rest durations.'
  },
  {
    id: 'map-power-heatmap',
    name: 'Power Heatmap Map',
    description: 'Visualize your power output intensity geographically.',
    category: 'power',
    mode: 'stream',
    visualType: 'map-heatmap',
    flagship: true,
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'watts',
      alignment: 'distance'
    },
    insightCopy:
      'Identify precisely which sections of the route required the most intensity and where you recovered.'
  },
  {
    id: 'aerobic-decoupling-trace',
    name: 'Aerobic Decoupling Trace',
    description: 'Real-time efficiency ratio throughout the session.',
    category: 'efficiency',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'power_hr_ratio',
      alignment: 'elapsed_time'
    },
    insightCopy:
      'A downward trend indicates aerobic drift, suggesting fatigue or heat stress as the workout progresses.'
  },
  {
    id: 'w-balance-trace',
    name: "W' Balance (Anaerobic Tank)",
    description: 'Track your anaerobic battery depletion and recharge.',
    category: 'power',
    mode: 'stream',
    visualType: 'line',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'w_balance',
      alignment: 'elapsed_time'
    },
    insightCopy: 'Visualize how many "matches" you had left during high-intensity efforts.'
  },
  {
    id: 'quadrant-analysis-density',
    name: 'Quadrant Analysis (Power-Cadence)',
    description: '2D density map of force vs. velocity.',
    category: 'power',
    mode: 'density',
    visualType: 'density-heatmap',
    sourceLabel: 'Workout Streams',
    density: {
      xField: 'cadence',
      yField: 'watts'
    },
    insightCopy: 'See if you were "grinding" or "spinning" throughout the session.'
  },
  {
    id: 'climb-vam-profile',
    name: 'Climbing VAM Profile',
    description: 'Vertical Ascent Meters (m/h) for every detected climb or lap.',
    category: 'terrain',
    mode: 'stream',
    visualType: 'bar',
    sourceLabel: 'Workout Streams',
    stream: {
      field: 'vam',
      alignment: 'distance'
    },
    insightCopy: 'Evaluate your climbing speed performance across different segments of the ride.'
  }
]

export function findWorkoutExplorerPresetById(id: string) {
  return WORKOUT_EXPLORER_PRESETS.find((preset) => preset.id === id)
}
