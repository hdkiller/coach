import { format } from 'date-fns'

export function buildEfficiencyTrendData(
  workouts: Array<{
    id?: string
    date: string | Date
    normalizedPower?: number | null
    averageWatts?: number | null
    averageHr?: number | null
    rawJson?: Record<string, any> | null
  }>
) {
  return workouts.map((w) => {
    const workoutDate = new Date(w.date)
    const power = w.normalizedPower || w.averageWatts || 0
    const hr = w.averageHr || 1
    const ef = power / hr

    let decoupling = null
    if (w.rawJson && typeof w.rawJson === 'object') {
      if (w.rawJson.decoupling) decoupling = w.rawJson.decoupling
      if (w.rawJson.aerobic_decoupling) decoupling = w.rawJson.aerobic_decoupling
    }

    return {
      workoutId: w.id ?? null,
      date: format(workoutDate, 'yyyy-MM-dd'),
      timestamp: workoutDate.toISOString(),
      efficiencyFactor: parseFloat(ef.toFixed(2)),
      decoupling,
      normalizedPower: w.normalizedPower,
      averageHr: w.averageHr
    }
  })
}
