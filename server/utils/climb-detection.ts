export interface Climb {
  start_index: number
  end_index: number
  start_time: number
  end_time: number
  duration: number
  distance: number
  ascent: number
  avg_grade: number
  max_grade: number
  start_altitude: number
  end_altitude: number
}

/**
 * Detect significant climbs in altitude stream
 * @param time - Time stream (seconds)
 * @param altitude - Altitude stream (meters)
 * @param distance - Distance stream (meters)
 * @returns Array of detected climbs
 */
export function detectClimbs(time: number[], altitude: number[], distance: number[]): Climb[] {
  if (!altitude || altitude.length < 10) return []

  const climbs: Climb[] = []

  // Smoothing window for altitude (meters) to avoid jitter
  const windowSize = 5
  const smoothedAlt = altitude.map((_, i, arr) => {
    const start = Math.max(0, i - windowSize)
    const end = Math.min(arr.length, i + windowSize)
    const subset = arr.slice(start, end)
    return subset.reduce((a, b) => a + (b || 0), 0) / subset.length
  })

  // Detect continuous ascent segments
  let inClimb = false
  let startIndex = 0

  // Thresholds for a "Climb"
  const MIN_ASCENT = 10 // meters
  const MIN_DISTANCE = 100 // meters
  const MIN_GRADE = 1.0 // percent

  for (let i = 1; i < smoothedAlt.length; i++) {
    const diff = smoothedAlt[i]! - smoothedAlt[i - 1]!

    // Simple logic: if altitude is increasing or flat-ish (+ some tolerance)
    const isAscending = diff >= -0.1

    if (isAscending && !inClimb) {
      inClimb = true
      startIndex = i - 1
    } else if (!isAscending && inClimb) {
      inClimb = false
      const endIndex = i - 1

      const ascent = smoothedAlt[endIndex]! - smoothedAlt[startIndex]!
      const dist = distance[endIndex]! - distance[startIndex]!

      if (ascent >= MIN_ASCENT && dist >= MIN_DISTANCE) {
        const avgGrade = (ascent / dist) * 100

        if (avgGrade >= MIN_GRADE) {
          // Find max instantaneous grade in segment
          let maxGrade = 0
          for (let j = startIndex + 1; j <= endIndex; j++) {
            const dD = distance[j]! - distance[j - 1]!
            const dA = smoothedAlt[j]! - smoothedAlt[j - 1]!
            if (dD > 2) {
              // Need some minimum distance for local grade
              const localGrade = (dA / dD) * 100
              if (localGrade > maxGrade) maxGrade = localGrade
            }
          }

          climbs.push({
            start_index: startIndex,
            end_index: endIndex,
            start_time: time[startIndex]!,
            end_time: time[endIndex]!,
            duration: time[endIndex]! - time[startIndex]!,
            distance: Math.round(dist),
            ascent: Math.round(ascent),
            avg_grade: Math.round(avgGrade * 10) / 10,
            max_grade: Math.round(maxGrade * 10) / 10,
            start_altitude: Math.round(altitude[startIndex]! * 10) / 10,
            end_altitude: Math.round(altitude[endIndex]! * 10) / 10
          })
        }
      }
    }
  }

  // Handle case if workout ends on a climb
  if (inClimb) {
    const endIndex = smoothedAlt.length - 1
    const ascent = smoothedAlt[endIndex]! - smoothedAlt[startIndex]!
    const dist = distance[endIndex]! - distance[startIndex]!
    if (ascent >= MIN_ASCENT && dist >= MIN_DISTANCE) {
      climbs.push({
        start_index: startIndex,
        end_index: endIndex,
        start_time: time[startIndex]!,
        end_time: time[endIndex]!,
        duration: time[endIndex]! - time[startIndex]!,
        distance: Math.round(dist),
        ascent: Math.round(ascent),
        avg_grade: Math.round((ascent / dist) * 100 * 10) / 10,
        max_grade: 0, // max calculation skipped for simplicity here
        start_altitude: Math.round(altitude[startIndex]! * 10) / 10,
        end_altitude: Math.round(altitude[endIndex]! * 10) / 10
      })
    }
  }

  // Merge segments that are very close (e.g. separated by < 20m of descent)
  // TODO: Implement merging if needed for cleaner UI

  return climbs
}
