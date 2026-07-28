const METERS_PER_MILE = 1609.344
const METERS_PER_FOOT = 0.3048

/**
 * Formats a chart axis tick label for stream alignment values (elapsed time,
 * distance, or percent complete). Distance labels respect the athlete's
 * `distanceUnits` preference ('Miles' renders miles/feet, anything else
 * renders kilometers/meters).
 *
 * Shared between the workout-comparison and workout-explorer analytics
 * stream endpoints, which previously duplicated this logic.
 */
export function formatAlignmentLabel(
  value: number,
  alignment: 'elapsed_time' | 'distance' | 'percent_complete',
  distanceUnits?: string | null
) {
  if (alignment === 'elapsed_time') {
    if (value >= 3600) return `${(value / 3600).toFixed(1)}h`
    if (value >= 60) return `${Math.round(value / 60)}m`
    return `${Math.round(value)}s`
  }

  if (alignment === 'distance') {
    if (distanceUnits === 'Miles') {
      const miles = value / METERS_PER_MILE
      if (miles >= 1) return `${miles.toFixed(1)}mi`
      return `${Math.round(value / METERS_PER_FOOT)}ft`
    }

    if (value >= 1000) return `${(value / 1000).toFixed(1)}km`
    return `${Math.round(value)}m`
  }

  return `${Math.round(value)}%`
}
