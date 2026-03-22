export const ANALYTICS_SYSTEM_PRESETS = [
  {
    id: 'system-pmc',
    name: 'Performance Management (PMC)',
    description: 'Track your Fitness (CTL), Fatigue (ATL), and Form (TSB) over time.',
    type: 'line',
    source: 'wellness',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'daily',
    metrics: [
      { field: 'ctl', aggregation: 'avg' },
      { field: 'atl', aggregation: 'avg' },
      { field: 'tsb', aggregation: 'avg' }
    ],
    styling: { showLegend: true }
  },
  {
    id: 'system-weekly-tss',
    name: 'Weekly Load Trend',
    description: 'Sum of Training Stress Score (TSS) per week.',
    type: 'bar',
    source: 'workouts',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [
      { field: 'tss', aggregation: 'sum' }
    ],
    styling: { showLegend: true }
  },
  {
    id: 'system-hrv-recovery',
    name: 'HRV & Recovery Correlation',
    description: 'How your heart rate variability relates to your readiness score.',
    type: 'line',
    source: 'wellness',
    timeRange: { type: 'rolling', value: '30d' },
    grouping: 'daily',
    metrics: [
      { field: 'hrv', aggregation: 'avg' },
      { field: 'recoveryScore', aggregation: 'avg' }
    ],
    styling: { showLegend: true }
  }
]
