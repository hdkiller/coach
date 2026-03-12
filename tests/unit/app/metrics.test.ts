import { describe, expect, it } from 'vitest'
import {
  convertVelocity,
  formatVelocity,
  getVelocityUnitLabel,
  isRideWorkoutType
} from '../../../app/utils/metrics'

describe('velocity display helpers', () => {
  it('formats cycling speed in metric units', () => {
    expect(getVelocityUnitLabel('Kilometers')).toBe('km/h')
    expect(convertVelocity(10, 'Kilometers')).toBe(36)
    expect(formatVelocity(10, 'Kilometers')).toBe('36.0 km/h')
  })

  it('formats cycling speed in imperial units', () => {
    expect(getVelocityUnitLabel('Miles')).toBe('mph')
    expect(formatVelocity(10, 'Miles')).toBe('22.4 mph')
  })

  it('detects ride workout types including ebike sessions', () => {
    expect(isRideWorkoutType('Ride')).toBe(true)
    expect(isRideWorkoutType('EBike Ride')).toBe(true)
    expect(isRideWorkoutType('VirtualRide')).toBe(true)
    expect(isRideWorkoutType('Run')).toBe(false)
  })
})
