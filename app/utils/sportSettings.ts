/**
 * Get the applicable sport settings for a specific activity type.
 * Falls back to Default if no specific match found.
 * Mirrors logic in server/utils/repositories/sportSettingsRepository.ts
 */
export function getSportSettingsForActivity(allSettings: any[], activityType: string) {
  if (!allSettings || allSettings.length === 0) return null

  // Ensure activityType is valid
  if (!activityType) {
    return allSettings.find((s: any) => s.isDefault) || null
  }

  // 1. Exact match in types array (excluding default)
  const specific = allSettings.find(
    (s: any) => !s.isDefault && s.types && s.types.includes(activityType)
  )
  if (specific) return specific

  // 2. Partial match (e.g. "Ride" matches "VirtualRide")
  const partial = allSettings.find(
    (s: any) => !s.isDefault && s.types && s.types.some((t: string) => activityType.includes(t))
  )
  if (partial) return partial

  // 3. Fallback to Default
  return allSettings.find((s: any) => s.isDefault) || null
}

export function getDefaultSportSettings(allSettings: any[]) {
  if (!allSettings) return null
  return allSettings.find((s: any) => s.isDefault) || null
}

/**
 * Determine the preferred metric (hr, power, or pace) based on sport settings preference
 * and available data streams.
 */
export function getPreferredMetric(
  settings: any,
  availableData: { hasHr: boolean; hasPower: boolean; hasPace?: boolean }
): 'hr' | 'power' | 'pace' {
  const { hasHr, hasPower, hasPace } = availableData
  const toMetricToken = (value: unknown): 'HR' | 'POWER' | 'PACE' | null => {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    if (normalized === 'hr' || normalized === 'heart_rate' || normalized === 'heartrate') {
      return 'HR'
    }
    if (normalized === 'power') return 'POWER'
    if (normalized === 'pace') return 'PACE'
    return null
  }

  const order: Array<'HR' | 'POWER' | 'PACE'> = []
  const fallbackOrder = Array.isArray(settings?.targetPolicy?.fallbackOrder)
    ? settings.targetPolicy.fallbackOrder
    : []
  for (const item of fallbackOrder) {
    const metric = toMetricToken(item)
    if (metric && !order.includes(metric)) order.push(metric)
  }

  if (order.length === 0) {
    const legacy = String(settings?.loadPreference || 'POWER_HR_PACE')
      .split('_')
      .map((token) => token.trim().toUpperCase())
    for (const token of legacy) {
      if ((token === 'HR' || token === 'POWER' || token === 'PACE') && !order.includes(token)) {
        order.push(token)
      }
    }
  }

  const primaryMetric = toMetricToken(settings?.targetPolicy?.primaryMetric)
  if (primaryMetric) {
    const rest = order.filter((metric) => metric !== primaryMetric)
    order.splice(0, order.length, primaryMetric, ...rest)
  }

  for (const metric of ['POWER', 'HR', 'PACE'] as const) {
    if (!order.includes(metric)) order.push(metric)
  }

  for (const metric of order) {
    if (metric === 'HR' && hasHr) return 'hr'
    if (metric === 'POWER' && hasPower) return 'power'
    if (metric === 'PACE' && hasPace) return 'pace'
  }

  // Fallbacks if preferred not available
  if (hasHr) return 'hr'
  if (hasPower) return 'power'
  if (hasPace) return 'pace'

  return 'hr' // Final fallback
}
