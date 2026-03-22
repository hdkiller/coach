import { KG_TO_LBS } from './number'

/**
 * Format weight for AI prompts based on user preference
 */
export function formatPromptWeight(
  weight: number | null | undefined,
  weightUnits?: string | null
): string {
  if (weight === null || weight === undefined) return 'Unknown'

  if (weightUnits === 'Pounds') {
    return `${(weight * KG_TO_LBS).toFixed(1)} lbs`
  }

  return `${weight.toFixed(1)} kg`
}

/**
 * Format height for AI prompts based on user preference
 */
export function formatPromptHeight(
  heightCm: number | null | undefined,
  heightUnits?: string | null
): string {
  if (heightCm === null || heightCm === undefined) return 'Unknown'

  if (heightUnits === 'Feet') {
    const totalInches = heightCm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return `${feet}'${inches}"`
  }

  return `${Math.round(heightCm)} cm`
}

/**
 * Format distance for AI prompts based on user preference
 */
export function formatPromptDistance(
  distanceMeters: number | null | undefined,
  distanceUnits?: string | null
): string {
  if (distanceMeters === null || distanceMeters === undefined) return 'Unknown'

  if (distanceUnits === 'Miles') {
    return `${(distanceMeters / 1609.344).toFixed(2)} mi`
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`
}

/**
 * Format elevation for AI prompts based on user preference
 * Elevation units follow distance units (Kilometers -> Meters, Miles -> Feet)
 */
export function formatPromptElevation(
  elevationMeters: number | null | undefined,
  distanceUnits?: string | null
): string {
  if (elevationMeters === null || elevationMeters === undefined) return '0'

  if (distanceUnits === 'Miles') {
    return `${Math.round(elevationMeters * 3.28084)} ft`
  }

  return `${Math.round(elevationMeters)} m`
}

/**
 * Format temperature for AI prompts based on user preference
 */
export function formatPromptTemperature(
  tempCelsius: number | null | undefined,
  temperatureUnits?: string | null
): string {
  if (tempCelsius === null || tempCelsius === undefined) return 'Unknown'

  if (temperatureUnits === 'Fahrenheit') {
    return `${((tempCelsius * 9) / 5 + 32).toFixed(1)}°F`
  }

  return `${tempCelsius.toFixed(1)}°C`
}

/**
 * Format pace for AI prompts based on user preference
 */
export function formatPromptPace(
  secondsPerKm: number | null | undefined,
  distanceUnits?: string | null
): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return 'N/A'

  let effectiveSeconds = secondsPerKm
  let unitLabel = '/km'

  if (distanceUnits === 'Miles') {
    effectiveSeconds = secondsPerKm * 1.609344
    unitLabel = '/mi'
  }

  const total = Math.round(effectiveSeconds)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}${unitLabel}`
}
