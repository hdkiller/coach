import { calculateAveragePace, formatPace, calculateOptimalCadence } from '../pacing'
import { calculatePowerZones, calculateHrZones, formatZoneRange } from '../zones'

/**
 * Calculate training metrics (pace, zones, conversions)
 */
export async function calculateTrainingMetrics(args: any): Promise<any> {
  const {
    operation,
    distance_meters,
    duration_seconds,
    ftp,
    lthr,
    max_hr,
    value,
    from_unit,
    to_unit,
    speed_kmh,
    height_cm,
    leg_length_cm,
    current_cadence,
    goal
  } = args

  if (operation === 'calculate_pace') {
    if (!distance_meters || !duration_seconds) {
      return {
        error: 'distance_meters and duration_seconds are required for calculate_pace'
      }
    }
    const paceMinPerKm = calculateAveragePace(duration_seconds, distance_meters)
    return {
      pace_min_per_km: paceMinPerKm,
      formatted_pace: formatPace(paceMinPerKm),
      speed_kmh: distance_meters / 1000 / (duration_seconds / 3600),
      speed_mph: distance_meters / 1609.34 / (duration_seconds / 3600)
    }
  }

  if (operation === 'calculate_optimal_cadence') {
    // If we have pace components but not speed, calculate speed first
    let calculatedSpeed = speed_kmh

    if (!calculatedSpeed && distance_meters && duration_seconds) {
      calculatedSpeed = distance_meters / 1000 / (duration_seconds / 3600)
    }

    if (!calculatedSpeed) {
      return {
        error:
          'speed_kmh (or distance_meters + duration_seconds) is required for calculate_optimal_cadence'
      }
    }

    const result = calculateOptimalCadence(
      calculatedSpeed,
      height_cm,
      leg_length_cm,
      current_cadence,
      goal
    )
    return {
      speed_kmh: calculatedSpeed.toFixed(1),
      ...result
    }
  }

  if (operation === 'calculate_zones') {
    const result: any = {}

    if (ftp) {
      const zones = calculatePowerZones(ftp)
      result.power_zones = zones.map((z) => ({
        name: z.name,
        range: formatZoneRange(z, 'W'),
        min: z.min,
        max: z.max
      }))
    }

    if (lthr || max_hr) {
      const zones = calculateHrZones(lthr, max_hr)
      result.hr_zones = zones.map((z) => ({
        name: z.name,
        range: formatZoneRange(z, 'bpm'),
        min: z.min,
        max: z.max
      }))
    }

    if (Object.keys(result).length === 0) {
      return { error: 'Provide ftp, lthr, or max_hr to calculate zones' }
    }

    return result
  }

  if (operation === 'convert_units') {
    if (value === undefined || !from_unit || !to_unit) {
      return { error: 'value, from_unit, and to_unit are required for convert_units' }
    }

    const conversions: Record<string, number> = {
      'km-miles': 0.621371,
      'miles-km': 1.60934,
      'meters-feet': 3.28084,
      'feet-meters': 0.3048,
      'kg-lbs': 2.20462,
      'lbs-kg': 0.453592
    }

    const key = `${from_unit}-${to_unit}`.toLowerCase()
    const factor = conversions[key]

    if (factor !== undefined) {
      return {
        original: { value, unit: from_unit },
        converted: { value: value * factor, unit: to_unit },
        factor
      }
    } else {
      return { error: `Conversion from ${from_unit} to ${to_unit} not supported` }
    }
  }

  return { error: `Unknown operation: ${operation}` }
}
