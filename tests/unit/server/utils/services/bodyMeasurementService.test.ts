import { describe, expect, it } from 'vitest'
import { extractWellnessBodyMeasurements } from '../../../../../server/utils/services/bodyMeasurementService'

describe('extractWellnessBodyMeasurements', () => {
  it('extracts standard wellness metrics from explicit columns', () => {
    const measurements = extractWellnessBodyMeasurements({
      id: 'wellness-1',
      date: new Date('2026-03-04T00:00:00Z'),
      weight: 68.4,
      bodyFat: 17.3
    })

    expect(measurements).toEqual([
      { metricKey: 'weight', value: 68.4, unit: 'kg' },
      { metricKey: 'body_fat_pct', value: 17.3, unit: 'pct' }
    ])
  })

  it('extracts Intervals-style muscle mass fields from rawJson', () => {
    const measurements = extractWellnessBodyMeasurements({
      id: 'wellness-2',
      date: new Date('2026-03-04T00:00:00Z'),
      rawJson: {
        MuscleMass: 33.4,
        bodyFat: 17
      }
    })

    expect(measurements).toContainEqual({
      metricKey: 'muscle_mass_kg',
      value: 33.4,
      unit: 'kg'
    })
    expect(measurements).toContainEqual({
      metricKey: 'body_fat_pct',
      value: 17,
      unit: 'pct'
    })
  })

  it('extracts Withings body composition metrics from nested rawJson', () => {
    const measurements = extractWellnessBodyMeasurements({
      id: 'wellness-3',
      date: new Date('2026-03-04T00:00:00Z'),
      rawJson: {
        withings: {
          fatRatio: 18.2,
          muscleMass: 54.7,
          boneMass: 3.1
        }
      }
    })

    expect(measurements).toEqual([
      { metricKey: 'body_fat_pct', value: 18.2, unit: 'pct' },
      { metricKey: 'muscle_mass_kg', value: 54.7, unit: 'kg' },
      { metricKey: 'bone_mass_kg', value: 3.1, unit: 'kg' }
    ])
  })
})
