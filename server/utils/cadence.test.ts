import { describe, it, expect } from 'vitest'
import { calculateOptimalCadence } from './pacing'

describe('Pacing Utils - Cadence', () => {
  describe('calculateOptimalCadence', () => {
    it('calculates reference cadence correctly for 10km/h (6:00/km)', () => {
      // 124.4 + 3.83 * 10 = 162.7 -> 163
      const result = calculateOptimalCadence(10)
      expect(result.referenceCadence).toBe(163)
      expect(result.optimalRange.min).toBe(158)
      expect(result.optimalRange.max).toBe(168)
    })

    it('calculates reference cadence correctly for 15km/h (4:00/km)', () => {
      // 124.4 + 3.83 * 15 = 124.4 + 57.45 = 181.85 -> 182
      const result = calculateOptimalCadence(15)
      expect(result.referenceCadence).toBe(182)
    })

    it('adjusts for tall runners (>185cm)', () => {
      // 10km/h -> 163.
      // Height 190cm -> -3 spm -> 160
      const result = calculateOptimalCadence(10, 190)
      expect(result.referenceCadence).toBe(160)
    })

    it('adjusts for short runners (<165cm)', () => {
      // 10km/h -> 163.
      // Height 160cm -> +3 spm -> 166
      const result = calculateOptimalCadence(10, 160)
      expect(result.referenceCadence).toBe(166)
    })

    it('estimates leg length correctly when not provided', () => {
      // Height 175cm. Leg length should be ~82.25cm (0.47 ratio)
      const result = calculateOptimalCadence(10, 175)
      expect(result.metrics.legToHeightRatio).toBe('0.47')
    })

    it('adjusts for long leg-to-height ratio (>0.49)', () => {
      // Height 180, Leg 90 (Ratio 0.5)
      // 10km/h -> 163 - 3 = 160
      const result = calculateOptimalCadence(10, 180, 90)
      expect(result.referenceCadence).toBe(160)
    })

    it('applies injury prevention adjustment (+5%)', () => {
      // 10km/h -> 162.7
      // 162.7 * 1.05 = 170.8 -> 171
      const result = calculateOptimalCadence(10, 175, undefined, undefined, 'injury_prevention')
      expect(result.referenceCadence).toBe(171)
      expect(result.metrics.adjustmentApplied).toContain('+5%')
    })

    it('identifies low cadence status', () => {
      // 10km/h -> 163. Range [158, 168]
      // Current 150 -> low
      const result = calculateOptimalCadence(10, 175, undefined, 150)
      expect(result.status).toBe('low')
      expect(result.recommendation).toContain('Consider a gradual increase')
    })

    it('identifies optimal cadence status', () => {
      const result = calculateOptimalCadence(10, 175, undefined, 162)
      expect(result.status).toBe('optimal')
      expect(result.recommendation).toContain('Great job')
    })

    it('identifies high cadence status', () => {
      const result = calculateOptimalCadence(10, 175, undefined, 175)
      expect(result.status).toBe('high')
    })
  })
})
