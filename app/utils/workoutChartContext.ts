import { getPreferredMetric } from '~/utils/sportSettings'

export function getStructuredWorkoutPayload(workout: any) {
  if (!workout) return null
  if (workout.structuredWorkout && typeof workout.structuredWorkout === 'object') {
    return workout.structuredWorkout
  }
  return workout
}

export function resolveWorkoutChartSportSettings(workout: any, sportSettings?: any) {
  const rootWorkout = workout?.structuredWorkout ? workout : workout?._workoutContext || workout
  const snapshot =
    rootWorkout?.lastGenerationSettingsSnapshot ||
    rootWorkout?.generationSettingsSnapshot ||
    rootWorkout?.createdFromSettingsSnapshot ||
    null

  const merged = {
    ...(sportSettings || {}),
    ...(snapshot || {})
  }

  return {
    ...merged,
    ftp: Number(snapshot?.thresholds?.ftp || snapshot?.ftp || sportSettings?.ftp || 0),
    lthr: Number(snapshot?.thresholds?.lthr || snapshot?.lthr || sportSettings?.lthr || 0),
    maxHr: Number(snapshot?.thresholds?.maxHr || snapshot?.maxHr || sportSettings?.maxHr || 0),
    thresholdPace: Number(
      snapshot?.thresholds?.thresholdPace ||
        snapshot?.thresholdPace ||
        sportSettings?.thresholdPace ||
        0
    ),
    hrZones: Array.isArray(snapshot?.zones?.heartRate)
      ? snapshot.zones.heartRate
      : Array.isArray(snapshot?.hrZones)
        ? snapshot.hrZones
        : Array.isArray(sportSettings?.hrZones)
          ? sportSettings.hrZones
          : [],
    powerZones: Array.isArray(snapshot?.zones?.power)
      ? snapshot.zones.power
      : Array.isArray(snapshot?.powerZones)
        ? snapshot.powerZones
        : Array.isArray(sportSettings?.powerZones)
          ? sportSettings.powerZones
          : [],
    paceZones: Array.isArray(snapshot?.zones?.pace)
      ? snapshot.zones.pace
      : Array.isArray(snapshot?.paceZones)
        ? snapshot.paceZones
        : Array.isArray(sportSettings?.paceZones)
          ? sportSettings.paceZones
          : [],
    targetPolicy:
      snapshot?.targetPolicy || sportSettings?.targetPolicy || merged.targetPolicy || undefined,
    loadPreference:
      snapshot?.loadPreference ||
      sportSettings?.loadPreference ||
      merged.loadPreference ||
      undefined
  }
}

export function getWorkoutChartPreference(
  workout: any,
  sportSettings: any,
  availableData: { hasHr: boolean; hasPower: boolean; hasPace?: boolean }
): 'hr' | 'power' | 'pace' {
  const effectiveSettings = resolveWorkoutChartSportSettings(workout, sportSettings)
  return getPreferredMetric(effectiveSettings, availableData)
}
