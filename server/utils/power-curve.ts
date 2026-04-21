export interface PowerCurveWindow {
  duration: number
  durationLabel: string
  power: number
  startIndex: number
  endIndex: number
  startTime: number
  endTime: number
}

export const STANDARD_POWER_CURVE_DURATIONS = [5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600]

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function formatPowerCurveDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

export function computePowerCurveWindows(
  wattsInput: unknown,
  timeInput: unknown,
  durations = STANDARD_POWER_CURVE_DURATIONS
): PowerCurveWindow[] {
  if (!Array.isArray(wattsInput) || wattsInput.length === 0) return []

  const watts = wattsInput.map((value) => {
    const parsed = toFiniteNumber(value)
    return parsed !== null && parsed > 0 ? parsed : 0
  })

  const rawTime = Array.isArray(timeInput) ? timeInput : []
  const time = watts.map((_, index) => {
    const parsed = toFiniteNumber(rawTime[index])
    return parsed !== null ? parsed : index
  })

  if (time.length < 2) return []

  const windows: PowerCurveWindow[] = []

  for (const duration of durations) {
    const lastTime = time[time.length - 1]
    const firstTime = time[0]
    if (lastTime === undefined || firstTime === undefined || lastTime - firstTime < duration) {
      continue
    }

    let bestAverage = -Infinity
    let bestStartIndex = -1
    let bestEndIndex = -1
    let currentSum = 0
    let startIndex = 0

    for (let endIndex = 0; endIndex < watts.length; endIndex++) {
      currentSum += watts[endIndex] || 0

      while (
        startIndex < endIndex &&
        time[endIndex] !== undefined &&
        time[startIndex] !== undefined &&
        time[endIndex]! - time[startIndex]! > duration
      ) {
        currentSum -= watts[startIndex] || 0
        startIndex++
      }

      const startTime = time[startIndex]
      const endTime = time[endIndex]
      if (startTime === undefined || endTime === undefined) continue

      const windowDuration = endTime - startTime
      if (windowDuration < duration * 0.95) continue

      const average = currentSum / (endIndex - startIndex + 1)
      if (average > bestAverage) {
        bestAverage = average
        bestStartIndex = startIndex
        bestEndIndex = endIndex
      }
    }

    const startTime = time[bestStartIndex]
    const endTime = time[bestEndIndex]
    if (
      bestStartIndex >= 0 &&
      bestEndIndex >= bestStartIndex &&
      startTime !== undefined &&
      endTime !== undefined &&
      bestAverage > 0
    ) {
      windows.push({
        duration,
        durationLabel: formatPowerCurveDuration(duration),
        power: Math.round(bestAverage),
        startIndex: bestStartIndex,
        endIndex: bestEndIndex,
        startTime,
        endTime
      })
    }
  }

  return windows
}
