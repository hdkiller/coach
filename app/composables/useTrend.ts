export type TrendType = 'higher-is-better' | 'lower-is-better' | 'neutral'

export interface TrendResult {
  direction: 'up' | 'down' | 'flat'
  delta: number
  percent: number
  icon: string
  color: string
  label: string
}

export function useTrend() {
  const calculateTrend = (
    current: number,
    previous: number | number[],
    type: TrendType = 'higher-is-better',
    thresholdPercent: number = 1 // 1% change required to be considered a trend
  ): TrendResult => {
    // Calculate previous value (single value or average of array)
    let prevValue = 0
    if (Array.isArray(previous)) {
      if (previous.length === 0)
        prevValue = current // No history, assume flat
      else prevValue = previous.reduce((a, b) => a + b, 0) / previous.length
    } else {
      prevValue = previous
    }

    // Avoid division by zero
    if (prevValue === 0) prevValue = 1

    const delta = current - prevValue
    const percent = (delta / prevValue) * 100
    const absPercent = Math.abs(percent)

    // Determine direction
    let direction: 'up' | 'down' | 'flat' = 'flat'
    if (absPercent >= thresholdPercent) {
      direction = delta > 0 ? 'up' : 'down'
    }

    // Determine styling based on type
    let icon = 'i-heroicons-minus'
    let color = 'text-gray-500 dark:text-gray-400'
    let label = 'Stable'

    if (direction === 'up') {
      icon = 'i-heroicons-arrow-trending-up'
      if (type === 'higher-is-better') {
        color = 'text-green-600 dark:text-green-400'
        label = 'Improving'
      } else if (type === 'lower-is-better') {
        color = 'text-red-600 dark:text-red-400'
        label = 'Increasing' // Negative context
      } else {
        color = 'text-blue-600 dark:text-blue-400'
        label = 'Increasing'
      }
    } else if (direction === 'down') {
      icon = 'i-heroicons-arrow-trending-down'
      if (type === 'higher-is-better') {
        color = 'text-red-600 dark:text-red-400'
        label = 'Declining'
      } else if (type === 'lower-is-better') {
        color = 'text-green-600 dark:text-green-400'
        label = 'Improving'
      } else {
        color = 'text-blue-600 dark:text-blue-400'
        label = 'Decreasing'
      }
    }

    return {
      direction,
      delta,
      percent,
      icon,
      color,
      label
    }
  }

  return {
    calculateTrend
  }
}
