import { describe, expect, it } from 'vitest'
import { normalizeGarminActivityType } from './activity-mapping'

describe('normalizeGarminActivityType', () => {
  it('maps current Garmin cycling subtypes to ride types', () => {
    expect(normalizeGarminActivityType('CYCLING')).toBe('Ride')
    expect(normalizeGarminActivityType('ROAD_BIKING')).toBe('Ride')
    expect(normalizeGarminActivityType('INDOOR_CYCLING')).toBe('VirtualRide')
    expect(normalizeGarminActivityType('MOUNTAIN_BIKING')).toBe('MountainBikeRide')
  })

  it('maps common non-cycling Garmin activity types', () => {
    expect(normalizeGarminActivityType('WALKING')).toBe('Walk')
    expect(normalizeGarminActivityType('INDOOR_ROWING')).toBe('Rowing')
    expect(normalizeGarminActivityType('STRENGTH_TRAINING')).toBe('WeightTraining')
    expect(normalizeGarminActivityType('ELLIPTICAL')).toBe('Elliptical')
    expect(normalizeGarminActivityType('LAP_SWIMMING')).toBe('Swim')
  })

  it('falls back by keyword and defaults to other', () => {
    expect(normalizeGarminActivityType('GRAVEL_BIKING')).toBe('Ride')
    expect(normalizeGarminActivityType('UNKNOWN_CUSTOM_TYPE')).toBe('Other')
    expect(normalizeGarminActivityType('')).toBe('Other')
  })
})
