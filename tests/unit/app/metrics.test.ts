import { describe, expect, it } from 'vitest'
import {
  convertElevation,
  convertVelocity,
  formatElevation,
  formatPace,
  formatVelocity,
  getElevationUnitLabel,
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

describe('formatPace', () => {
  it('formats pace in minutes:seconds/km for a Kilometers-preference athlete', () => {
    // 5:00 per km == 300 seconds/km
    expect(formatPace(300, 'Kilometers')).toBe('5:00/km')
  })

  it('leaves Kilometers-preference athletes unaffected (existing behavior preserved)', () => {
    expect(formatPace(330, 'Kilometers')).toBe('5:30/km')
    expect(formatPace(330, null)).toBe('5:30/km')
    expect(formatPace(330, undefined)).toBe('5:30/km')
    expect(formatPace(330, 'SomethingElse')).toBe('5:30/km')
  })

  it('converts to minutes:seconds/mi for a Miles-preference athlete', () => {
    // 300 seconds/km * 1.609344 = 482.8032 seconds/mile -> rounds to 483s -> 8:03/mi
    expect(formatPace(300, 'Miles')).toBe('8:03/mi')
  })

  it('rounds seconds correctly without letting them overflow to 60', () => {
    // 359.6s/km rounds to 360s -> 6:00, not 5:60
    expect(formatPace(359.6, 'Kilometers')).toBe('6:00/km')
  })

  it('supports fractional-second precision via the decimals parameter', () => {
    expect(formatPace(369.65, 'Kilometers', 1)).toBe('6:09.7/km')
  })

  it('returns N/A for invalid input', () => {
    expect(formatPace(0, 'Kilometers')).toBe('N/A')
    expect(formatPace(-5, 'Kilometers')).toBe('N/A')
    expect(formatPace(null, 'Kilometers')).toBe('N/A')
    expect(formatPace(undefined, 'Kilometers')).toBe('N/A')
    expect(formatPace(NaN, 'Kilometers')).toBe('N/A')
    expect(formatPace(Infinity, 'Kilometers')).toBe('N/A')
  })
})

describe('formatElevation', () => {
  it('converts to feet and rounds for a Miles-preference athlete', () => {
    // 100m * 3.28084 = 328.084 -> rounds to 328
    expect(formatElevation(100, 'Miles')).toBe('328 ft')
    // 1500m * 3.28084 = 4921.26 -> rounds to 4921
    expect(formatElevation(1500, 'Miles')).toBe('4921 ft')
  })

  it('leaves a Kilometers-preference athlete unaffected (existing behavior preserved)', () => {
    expect(formatElevation(100, 'Kilometers')).toBe('100 m')
    expect(formatElevation(1500, 'Kilometers')).toBe('1500 m')
    expect(formatElevation(100, null)).toBe('100 m')
    expect(formatElevation(100, undefined)).toBe('100 m')
    expect(formatElevation(100, 'SomethingElse')).toBe('100 m')
  })

  it('rounds fractional meter values for a Kilometers-preference athlete', () => {
    expect(formatElevation(123.6, 'Kilometers')).toBe('124 m')
  })

  it('returns N/A for null/undefined input', () => {
    expect(formatElevation(null, 'Miles')).toBe('N/A')
    expect(formatElevation(undefined, 'Kilometers')).toBe('N/A')
  })

  it('handles zero elevation gain', () => {
    expect(formatElevation(0, 'Miles')).toBe('0 ft')
    expect(formatElevation(0, 'Kilometers')).toBe('0 m')
  })
})

describe('getElevationUnitLabel / convertElevation', () => {
  it('labels feet for Miles and meters otherwise', () => {
    expect(getElevationUnitLabel('Miles')).toBe('ft')
    expect(getElevationUnitLabel('Kilometers')).toBe('m')
    expect(getElevationUnitLabel(null)).toBe('m')
    expect(getElevationUnitLabel(undefined)).toBe('m')
  })

  it('converts raw meter values without rounding, for chart/stream usage', () => {
    expect(convertElevation(100, 'Miles')).toBeCloseTo(328.084, 3)
    expect(convertElevation(100, 'Kilometers')).toBe(100)
  })
})
