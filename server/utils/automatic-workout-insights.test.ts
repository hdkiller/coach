import { describe, expect, it } from 'vitest'
import {
  isWorkoutEligibleForAutomaticInsights,
  normalizeAutomaticInsightWorkoutType
} from './automatic-workout-insights'

describe('automatic workout insight eligibility', () => {
  it('normalizes type variants used in production data', () => {
    expect(normalizeAutomaticInsightWorkoutType('HighIntensityIntervalTraining')).toBe(
      'highintensityintervaltraining'
    )
    expect(normalizeAutomaticInsightWorkoutType('Fitness_equipment')).toBe('fitnessequipment')
    expect(normalizeAutomaticInsightWorkoutType('E_biking')).toBe('ebiking')
    expect(normalizeAutomaticInsightWorkoutType(' Alpine_skiing ')).toBe('alpineskiing')
  })

  it('allows automatic insights for supported training sports', () => {
    expect(isWorkoutEligibleForAutomaticInsights('Ride')).toBe(true)
    expect(isWorkoutEligibleForAutomaticInsights('Running')).toBe(true)
    expect(isWorkoutEligibleForAutomaticInsights('OpenWaterSwim')).toBe(true)
    expect(isWorkoutEligibleForAutomaticInsights('WeightTraining')).toBe(true)
    expect(isWorkoutEligibleForAutomaticInsights('Fitness_equipment')).toBe(true)
    expect(isWorkoutEligibleForAutomaticInsights('StandUpPaddling')).toBe(true)
  })

  it('blocks automatic insights for recovery, lifestyle, and low-signal activity types', () => {
    expect(isWorkoutEligibleForAutomaticInsights('Sauna')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('IceBath')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Massage')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Meditation')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Walk')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Yoga')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Pilates')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Golf')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights('Driving')).toBe(false)
    expect(isWorkoutEligibleForAutomaticInsights(undefined)).toBe(false)
  })
})
