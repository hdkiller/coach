import { ZONE_COLORS, FALLBACK_ZONE_COLOR } from './zone-colors'

export interface ZoneDistribution {
  zoneIndex: number
  durationSec: number
  color: string
  label: string
}

export function flattenWorkoutSteps(steps: any[]): any[] {
  if (!Array.isArray(steps)) return []

  const flattened: any[] = []

  steps.forEach((step: any) => {
    const children = Array.isArray(step.steps) ? step.steps : []
    const hasChildren = children.length > 0

    if (hasChildren) {
      const repsRaw = Number(step.reps ?? step.repeat ?? step.intervals)
      const reps = repsRaw > 1 ? repsRaw : 1
      for (let i = 0; i < reps; i++) {
        flattened.push(...flattenWorkoutSteps(children))
      }
      return
    }

    flattened.push(step)
  })

  return flattened
}

export function getStepDuration(step: any): number {
  return Number(step.durationSeconds || step.duration || 0)
}

export function getStepIntensity(step: any, preference: 'power' | 'hr' = 'power'): number {
  const getTargetValue = (target: any) => {
    if (!target) return undefined
    if (typeof target === 'number') return target
    if (target.value !== undefined) return target.value
    if (target.range) return (target.range.start + target.range.end) / 2
    return undefined
  }

  const powerValue = getTargetValue(step.power)
  const hrValue = getTargetValue(step.heartRate || step.hr)

  if (preference === 'power' && powerValue !== undefined) return powerValue
  if (preference === 'hr' && hrValue !== undefined) return hrValue

  if (powerValue !== undefined) return powerValue
  if (hrValue !== undefined) return hrValue

  if (step.type === 'Rest') return 0.55
  return 0.75
}

const DEFAULT_POWER_ZONES = [
  { start: 0, end: 0.55 },
  { start: 0.55, end: 0.75 },
  { start: 0.75, end: 0.9 },
  { start: 0.9, end: 1.05 },
  { start: 1.05, end: 1.2 },
  { start: 1.2, end: 1.5 },
  { start: 1.5, end: 5.0 }
]

const DEFAULT_HR_ZONES = [
  { start: 0, end: 0.68 },
  { start: 0.68, end: 0.83 },
  { start: 0.83, end: 0.94 },
  { start: 0.94, end: 1.05 },
  { start: 1.05, end: 1.15 },
  { start: 1.15, end: 1.25 },
  { start: 1.25, end: 2.0 }
]

export function getZoneIndex(intensity: number, type: 'power' | 'hr' = 'power'): number {
  const zones = type === 'power' ? DEFAULT_POWER_ZONES : DEFAULT_HR_ZONES
  const index = zones.findIndex((z) => intensity <= z.end)
  return index === -1 ? zones.length - 1 : index
}

export function calculateWorkoutZoneDistribution(
  workout: any,
  type: 'power' | 'hr' = 'power'
): number[] {
  const distribution = new Array(7).fill(0)
  const structuredWorkout = workout.structuredWorkout || workout
  if (!structuredWorkout || !Array.isArray(structuredWorkout.steps)) return distribution

  const steps = flattenWorkoutSteps(structuredWorkout.steps)
  steps.forEach((step) => {
    const duration = getStepDuration(step)
    const intensity = getStepIntensity(step, type)
    const zoneIndex = getZoneIndex(intensity, type)
    distribution[zoneIndex] += duration
  })

  return distribution
}

export function calculateWeekZoneDistribution(
  workouts: any[],
  type: 'power' | 'hr' = 'power'
): number[] {
  const totalDistribution = new Array(7).fill(0)

  workouts.forEach((workout) => {
    const workoutDist = calculateWorkoutZoneDistribution(workout, type)
    workoutDist.forEach((val, i) => {
      totalDistribution[i] += val
    })
  })

  return totalDistribution
}
