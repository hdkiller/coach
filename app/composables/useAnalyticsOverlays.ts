export function useAnalyticsOverlays() {
  /**
   * Calculate a rolling average for a numeric series.
   */
  function rollingAverage(values: Array<number | null>, window: number) {
    return values.map((_, index) => {
      const slice = values
        .slice(Math.max(0, index - window + 1), index + 1)
        .filter((value): value is number => value !== null && !Number.isNaN(value))

      if (slice.length === 0) return null
      return Number((slice.reduce((sum, value) => sum + value, 0) / slice.length).toFixed(2))
    })
  }

  /**
   * Calculate upper and lower confidence bands (Standard Deviation) for a series.
   */
  function computeBand(values: Array<number | null>, window = 7) {
    const upper: Array<number | null> = []
    const lower: Array<number | null> = []

    values.forEach((_, index) => {
      const slice = values
        .slice(Math.max(0, index - window + 1), index + 1)
        .filter((value): value is number => value !== null && !Number.isNaN(value))

      if (slice.length < 2) {
        upper.push(null)
        lower.push(null)
        return
      }

      const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length
      const variance =
        slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / slice.length
      const stdDev = Math.sqrt(variance)
      upper.push(Number((mean + stdDev).toFixed(2)))
      lower.push(Number(Math.max(0, mean - stdDev).toFixed(2)))
    })

    return { upper, lower }
  }

  /**
   * Calculate a simple linear regression (best fit) line for a set of points.
   */
  function calculateRegression(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return []

    const count = points.length
    const sumX = points.reduce((sum, point) => sum + point.x, 0)
    const sumY = points.reduce((sum, point) => sum + point.y, 0)
    const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0)
    const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0)
    const denominator = count * sumXX - sumX * sumX

    if (!denominator) return []

    const slope = (count * sumXY - sumX * sumY) / denominator
    const intercept = (sumY - slope * sumX) / count
    const sorted = [...points].sort((a, b) => a.x - b.x)

    return sorted.map((point) => ({
      x: point.x,
      y: Number((slope * point.x + intercept).toFixed(2))
    }))
  }

  /**
   * Calculate the average of multiple series at each data point.
   */
  function averageSeries(series: Array<Array<number | null>>) {
    if (series.length === 0) return []

    return series[0]!.map((_, index) => {
      const values = series
        .map((dataset) => dataset[index])
        .filter((value): value is number => value !== null && !Number.isNaN(value))
      if (values.length === 0) return null
      return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    })
  }

  /**
   * Calculate the difference between two series (A - B).
   */
  function calculateDelta(seriesA: Array<number | null>, seriesB: Array<number | null>) {
    return seriesA.map((valA, index) => {
      const valB = seriesB[index]
      if (valA == null || valB == null) return null
      return Number((valA - valB).toFixed(2))
    })
  }

  return {
    rollingAverage,
    computeBand,
    calculateRegression,
    averageSeries,
    calculateDelta
  }
}
