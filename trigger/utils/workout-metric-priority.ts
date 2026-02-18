type MetricKey = 'PACE' | 'HR' | 'POWER'

const DEFAULT_PRIORITY: MetricKey[] = ['HR', 'POWER', 'PACE']
const VALID_METRICS = new Set<MetricKey>(['PACE', 'HR', 'POWER'])

function isMetricKey(value: string): value is MetricKey {
  return VALID_METRICS.has(value as MetricKey)
}

export interface MetricAvailability {
  hasPace: boolean
  hasHr: boolean
  hasPower: boolean
}

export interface MetricPriorityContext {
  loadPreference: string
  priority: MetricKey[]
  primaryMetric: MetricKey
  primaryMetricAvailable: boolean
  secondaryMetric: MetricKey | null
  secondaryMetricAvailable: boolean
  availability: MetricAvailability
}

export function parseLoadPreference(loadPreference?: string | null): MetricKey[] {
  const parsed = (loadPreference || '')
    .toUpperCase()
    .split('_')
    .map((m) => m.trim())
    .filter(isMetricKey)

  const merged = [...parsed, ...DEFAULT_PRIORITY]
  const unique: MetricKey[] = []
  for (const metric of merged) {
    if (!unique.includes(metric)) unique.push(metric)
  }
  return unique
}

export function detectMetricAvailability(workoutData: any): MetricAvailability {
  const hasPace = Boolean(
    (Array.isArray(workoutData?.lap_splits) && workoutData.lap_splits.length > 0) ||
    workoutData?.pace_variability_seconds ||
    workoutData?.avg_speed_ms ||
    workoutData?.pace_stability ||
    (workoutData?.distance_m && workoutData?.duration_s)
  )

  const hasHr = Boolean(workoutData?.avg_hr || workoutData?.max_hr)
  const hasPower = Boolean(
    workoutData?.avg_power ||
    workoutData?.normalized_power ||
    workoutData?.weighted_avg_power ||
    workoutData?.max_power
  )

  return { hasPace, hasHr, hasPower }
}

export function resolveMetricPriorityContext(
  loadPreference: string | null | undefined,
  workoutData: any
): MetricPriorityContext {
  const priority = parseLoadPreference(loadPreference)
  const availability = detectMetricAvailability(workoutData)

  const isAvailable = (metric: MetricKey): boolean => {
    if (metric === 'PACE') return availability.hasPace
    if (metric === 'HR') return availability.hasHr
    return availability.hasPower
  }

  const primaryMetric = priority[0] || 'HR'
  const secondaryMetric = priority[1] || null

  return {
    loadPreference: loadPreference || 'HR_POWER_PACE',
    priority,
    primaryMetric,
    primaryMetricAvailable: isAvailable(primaryMetric),
    secondaryMetric,
    secondaryMetricAvailable: secondaryMetric ? isAvailable(secondaryMetric) : false,
    availability
  }
}

export function buildMetricPriorityPromptBlock(ctx: MetricPriorityContext): string {
  const priorityOrder = ctx.priority.join(' > ')
  const primaryStatus = ctx.primaryMetricAvailable ? 'available' : 'missing'
  const secondaryStatus =
    ctx.secondaryMetric && ctx.secondaryMetricAvailable ? 'available' : 'missing_or_not_set'

  let block = '\n## Metric Priority Rules\n'
  block += `- **Preferred Metric Order**: ${priorityOrder}\n`
  block += `- **Primary Metric for this analysis**: ${ctx.primaryMetric} (${primaryStatus})\n`
  if (ctx.secondaryMetric) {
    block += `- **Secondary Metric for corroboration**: ${ctx.secondaryMetric} (${secondaryStatus})\n`
  }

  if (ctx.primaryMetricAvailable) {
    block += `- **Hard Rule**: Base most conclusions on ${ctx.primaryMetric} evidence. Use other metrics mainly for corroboration.\n`
  } else {
    block += `- **Fallback Rule**: Primary metric (${ctx.primaryMetric}) is missing. Explicitly state fallback and use the next available metric.\n`
  }

  if (ctx.primaryMetric === 'PACE' && ctx.primaryMetricAvailable) {
    block +=
      '- **Guardrail**: Do not make heart-rate zones the primary narrative when pace data is available.\n'
  }

  return block
}

export function shouldCondenseHeartRateSection(ctx: MetricPriorityContext): boolean {
  return ctx.primaryMetric === 'PACE' && ctx.primaryMetricAvailable
}

export function buildAnalysisRequestMetricRules(ctx: MetricPriorityContext): string[] {
  const rules: string[] = [
    `Prioritize metrics in this order: ${ctx.priority.join(' > ')}.`,
    `Use ${ctx.primaryMetric} as the primary evidence base whenever available.`
  ]

  if (ctx.primaryMetric === 'PACE' && ctx.primaryMetricAvailable) {
    rules.push(
      'If pace is available, keep heart-rate discussion secondary and use it only to support or challenge pace-based conclusions.'
    )
  }

  if (!ctx.primaryMetricAvailable) {
    rules.push(
      `Primary metric ${ctx.primaryMetric} is unavailable; explicitly call out the fallback metric you used and why.`
    )
  }

  return rules
}
