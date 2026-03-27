import { describe, it, expect } from 'vitest'
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateTimeInPaceZones,
  analyzePacingStrategy,
  detectSurges,
  calculateAveragePace,
  formatPace
} from './pacing'

describe('Pacing Utils', () => {
  describe('calculateLapSplits', () => {
    it('calculates 1km splits correctly for constant pace', () => {
      // Mock data: 3km at constant 4:00/km (240s/km) = 4.167 m/s
      // Time points every 100m approx (24s)
      const timeData: number[] = []
      const distanceData: number[] = []

      for (let i = 0; i <= 30; i++) {
        timeData.push(i * 24)
        distanceData.push(i * 100)
      }

      const splits = calculateLapSplits(timeData, distanceData, 1000)

      expect(splits).toHaveLength(3)

      // Check first split
      expect(splits[0].lap).toBe(1)
      expect(splits[0].distance).toBe(1000)
      expect(splits[0].time).toBe(240) // 4:00
      expect(splits[0].pace).toBe('4:00/km')

      // Check last split
      expect(splits[2].lap).toBe(3)
      expect(splits[2].distance).toBe(1000)
      expect(splits[2].time).toBe(240)
    })

    it('handles partial final lap', () => {
      // Mock data: 1.5km at constant pace
      const timeData: number[] = []
      const distanceData: number[] = []

      for (let i = 0; i <= 15; i++) {
        timeData.push(i * 24)
        distanceData.push(i * 100)
      }

      const splits = calculateLapSplits(timeData, distanceData, 1000)

      expect(splits).toHaveLength(2)

      // Full lap
      expect(splits[0].distance).toBe(1000)
      expect(splits[0].time).toBe(240)

      // Partial lap
      expect(splits[1].lap).toBe(2)
      expect(splits[1].distance).toBe(500)
      expect(splits[1].time).toBe(120)
      expect(splits[1].pace).toBe('4:00/km')
    })

    it('ignores very short remaining distance (<100m)', () => {
      const timeData: number[] = []
      const distanceData: number[] = []

      // 1050 meters
      for (let i = 0; i <= 10; i++) {
        // up to 1000m
        timeData.push(i * 24)
        distanceData.push(i * 100)
      }
      // Add one point at 1050m
      timeData.push(240 + 12)
      distanceData.push(1050)

      const splits = calculateLapSplits(timeData, distanceData, 1000)

      expect(splits).toHaveLength(1) // Should ignore the 50m lap
      expect(splits[0].distance).toBe(1000)
    })
  })

  describe('calculatePaceVariability', () => {
    it('returns 0 for constant velocity', () => {
      const velocity = [3.0, 3.0, 3.0, 3.0, 3.0]
      expect(calculatePaceVariability(velocity)).toBe(0)
    })

    it('calculates standard deviation correctly', () => {
      // 2, 4, 4, 4, 5, 5, 7, 9
      // Mean = 5
      // Variances: 9, 1, 1, 1, 0, 0, 4, 16
      // Sum = 32, Count = 8, Variance = 4
      // StdDev = 2
      const velocity = [2, 4, 4, 4, 5, 5, 7, 9]
      expect(calculatePaceVariability(velocity)).toBeCloseTo(2)
    })

    it('filters out stopped time (<0.5m/s)', () => {
      const velocity = [3.0, 0.1, 0.0, 3.0]
      // Should treat as [3.0, 3.0] -> variability 0
      expect(calculatePaceVariability(velocity)).toBe(0)
    })
  })

  describe('analyzePacingStrategy', () => {
    it('identifies even pacing', () => {
      const splits = [
        { paceSeconds: 240 }, // 4:00
        { paceSeconds: 242 },
        { paceSeconds: 238 },
        { paceSeconds: 240 }
      ]

      const result = analyzePacingStrategy(splits)
      expect(result.strategy).toBe('even')
      expect(result.evenness).toBeGreaterThan(90)
    })

    it('identifies positive split (slowing down)', () => {
      const splits = [
        { paceSeconds: 240 }, // 4:00
        { paceSeconds: 250 },
        { paceSeconds: 260 },
        { paceSeconds: 270 } // 4:30
      ]

      const result = analyzePacingStrategy(splits)
      expect(result.strategy).toBe('positive_split')
      expect(result.firstHalfPace!).toBeLessThan(result.secondHalfPace!)
    })

    it('identifies negative split (speeding up)', () => {
      const splits = [
        { paceSeconds: 270 },
        { paceSeconds: 260 },
        { paceSeconds: 250 },
        { paceSeconds: 240 }
      ]

      const result = analyzePacingStrategy(splits)
      expect(result.strategy).toBe('negative_split')
      expect(result.firstHalfPace!).toBeGreaterThan(result.secondHalfPace!)
    })
  })

  describe('formatPace', () => {
    it('formats 4:30/km correctly', () => {
      // 4.5 minutes = 4:30
      expect(formatPace(4.5)).toBe('4:30/km')
    })

    it('formats exact minutes correctly', () => {
      expect(formatPace(4.0)).toBe('4:00/km')
    })

    it('handles N/A', () => {
      expect(formatPace(0)).toBe('N/A')
      expect(formatPace(null)).toBe('N/A')
    })
  })

  describe('calculateTimeInPaceZones', () => {
    it('calculates zone distribution correctly', () => {
      const zones = [
        { name: 'Easy', min: 0, max: 3.0 },
        { name: 'Fast', min: 3.1, max: 10.0 }
      ]

      const velocityData = [0, 2.5, 2.5, 4.0, 4.0] // 0 is stop, skipped
      // Time points (1s intervals)
      const timeData = [0, 1, 2, 3, 4]

      // T0-T1: Vel 2.5 (Easy) -> 1s
      // T1-T2: Vel 2.5 (Easy) -> 1s
      // T2-T3: Vel 4.0 (Fast) -> 1s
      // T3-T4: Vel 4.0 (Fast) -> 1s

      const result = calculateTimeInPaceZones(velocityData, timeData, zones)

      expect(result[0].zone).toBe('Easy')
      expect(result[0].timeInZone).toBe(2)
      expect(result[0].percentage).toBe(50)

      expect(result[1].zone).toBe('Fast')
      expect(result[1].timeInZone).toBe(2)
      expect(result[1].percentage).toBe(50)
    })
  })

  describe('detectSurges', () => {
    it('detects a surge', () => {
      // Constant 3.0 then jump to 4.5
      // Need enough points because loop runs from 10 to length-10
      const velocity = Array(50).fill(3.0)
      velocity[25] = 4.5
      const time = velocity.map((_, i) => i)

      const surges = detectSurges(velocity, time, 1.0)

      expect(surges.length).toBeGreaterThan(0)
      expect(surges[0].increase).toBeGreaterThan(1.0)
    })
  })
})
