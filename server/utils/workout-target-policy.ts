export type MetricTarget = 'heartRate' | 'power' | 'pace' | 'rpe'

export interface TargetPolicy {
  primaryMetric: MetricTarget
  fallbackOrder: MetricTarget[]
  strictPrimary: boolean
  allowMixedTargetsPerStep: boolean
  defaultTargetStyle: 'value' | 'range'
  preferRangesForSteady: boolean
}

const METRIC_ORDER: MetricTarget[] = ['power', 'heartRate', 'pace', 'rpe']

function normalizeMetricToken(token: unknown): MetricTarget | null {
  if (typeof token !== 'string') return null
  const normalized = token.trim().toLowerCase()
  if (normalized === 'hr' || normalized === 'heartrate' || normalized === 'heart_rate') {
    return 'heartRate'
  }
  if (normalized === 'power') return 'power'
  if (normalized === 'pace') return 'pace'
  if (normalized === 'rpe') return 'rpe'
  return null
}

export function parseLegacyLoadPreference(loadPreference?: string | null): MetricTarget[] {
  if (!loadPreference || typeof loadPreference !== 'string') return [...METRIC_ORDER]
  const tokens = loadPreference.split('_')
  const metrics: MetricTarget[] = []
  for (const token of tokens) {
    const metric = normalizeMetricToken(token)
    if (metric && !metrics.includes(metric)) metrics.push(metric)
  }
  for (const metric of METRIC_ORDER) {
    if (!metrics.includes(metric)) metrics.push(metric)
  }
  return metrics
}

export function normalizeTargetPolicy(
  targetPolicy: any,
  loadPreference?: string | null
): TargetPolicy {
  const fallbackOrderRaw = Array.isArray(targetPolicy?.fallbackOrder)
    ? targetPolicy.fallbackOrder
    : parseLegacyLoadPreference(loadPreference)

  const fallbackOrder: MetricTarget[] = []
  for (const token of fallbackOrderRaw) {
    const metric = normalizeMetricToken(token)
    if (metric && !fallbackOrder.includes(metric)) fallbackOrder.push(metric)
  }
  for (const metric of METRIC_ORDER) {
    if (!fallbackOrder.includes(metric)) fallbackOrder.push(metric)
  }

  const explicitPrimary = normalizeMetricToken(targetPolicy?.primaryMetric)
  if (explicitPrimary) {
    const withoutPrimary = fallbackOrder.filter((metric) => metric !== explicitPrimary)
    fallbackOrder.splice(0, fallbackOrder.length, explicitPrimary, ...withoutPrimary)
  }
  const primaryMetric = explicitPrimary || fallbackOrder[0]

  return {
    primaryMetric,
    fallbackOrder,
    strictPrimary: targetPolicy?.strictPrimary !== false,
    allowMixedTargetsPerStep: Boolean(targetPolicy?.allowMixedTargetsPerStep),
    defaultTargetStyle: targetPolicy?.defaultTargetStyle === 'value' ? 'value' : 'range',
    preferRangesForSteady: targetPolicy?.preferRangesForSteady !== false
  }
}

export function formatSteadyTargetStyleInstruction(targetPolicy: TargetPolicy): string {
  if (targetPolicy.defaultTargetStyle === 'value') {
    return 'Prefer single-value targets for steady aerobic/endurance/tempo blocks. Use ranges only when the workout explicitly asks for a range or ramp.'
  }

  if (targetPolicy.preferRangesForSteady) {
    return 'Prefer ranges for steady aerobic/endurance/tempo blocks.'
  }

  return 'Range targets are optional for steady blocks; single-value targets are acceptable unless a range is explicitly requested.'
}

export function toLegacyLoadPreference(fallbackOrder: MetricTarget[]): string {
  const exportOrder = fallbackOrder.filter((metric) => metric !== 'rpe')
  const tokens = (exportOrder.length > 0 ? exportOrder : ['heartRate']).map((metric) => {
    if (metric === 'heartRate') return 'HR'
    if (metric === 'power') return 'POWER'
    if (metric === 'pace') return 'PACE'
    return 'RPE'
  })
  return tokens.join('_')
}
