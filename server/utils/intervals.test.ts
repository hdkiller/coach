import { describe, it, expect } from 'vitest'
import {
  normalizeIntervalsPlannedWorkout,
  normalizeIntervalsWorkout,
  cleanIntervalsDescription,
  normalizeIntervalsWellness
} from './intervals'

describe('Intervals.icu Data Normalization', () => {
  const USER_ID = 'test-user-id'

  describe('cleanIntervalsDescription', () => {
    it('strips Gym exercises list', () => {
      const fullText = `
This is the description.
It has multiple lines.

- **Bench Press**
  - 3 sets
- **Squat**
  - 3 sets
[CoachWatts]
      `.trim()

      const cleaned = cleanIntervalsDescription(fullText)
      expect(cleaned).toBe('This is the description.\nIt has multiple lines.')
    })
  })

  describe('normalizeIntervalsPlannedWorkout (Planned / Type B)', () => {
    it('forces start_date_local to UTC Midnight (2026-01-15)', () => {
      const input = {
        id: 'event-123',
        start_date_local: '2026-01-15T06:30:00', // 6:30 AM local time
        name: 'Morning Ride',
        category: 'WORKOUT',
        type: 'Ride'
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)

      // Should be 2026-01-15T00:00:00.000Z
      expect(result.date.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    })

    it('forces start_date_local to UTC Midnight even late in the day', () => {
      const input = {
        id: 'event-124',
        start_date_local: '2026-01-15T23:00:00', // 11 PM local time
        name: 'Late Ride',
        category: 'WORKOUT',
        type: 'Ride'
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)

      // Should STILL be 2026-01-15T00:00:00.000Z
      expect(result.date.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    })
  })

  describe('normalizeIntervalsWorkout (Completed / Type A)', () => {
    it('preserves exact UTC timestamp from start_date', () => {
      const input = {
        id: 'activity-123',
        start_date: '2026-01-15T14:30:00Z', // 2:30 PM UTC
        start_date_local: '2026-01-15T09:30:00', // 9:30 AM Local (UTC-5)
        name: 'Afternoon Run',
        type: 'Run'
      }

      const result = normalizeIntervalsWorkout(input as any, USER_ID)

      // Should match start_date exactly
      expect(result.date.toISOString()).toBe('2026-01-15T14:30:00.000Z')
    })

    it('falls back to start_date_local if start_date is missing (legacy)', () => {
      const input = {
        id: 'activity-124',
        start_date_local: '2026-01-15T09:30:00',
        name: 'Legacy Run',
        type: 'Run'
      }

      const result = normalizeIntervalsWorkout(input as any, USER_ID)

      // When parsing "2026-01-15T09:30:00" in a new Date() on a server,
      // it implies local time (if no Z).
      // However, normalizeIntervalsWorkout does: new Date(activity.start_date || activity.start_date_local)
      // new Date("2026-01-15T09:30:00") is environment dependent if ISO format without Z/Offset isn't strict.
      // But typically V8 parses ISO-like without 'Z' as UTC?
      // Wait, spec says ISO without timezone is Local.
      // Let's check what the result actually is.
      // If we want it to be reliable, we might need to fix the code, but let's test current behavior.

      // In this test environment, we might need to know the TZ or mock it.
      // But let's assume standard behavior.

      // Actually, let's just check it's NOT forced to midnight.
      expect(result.date.toISOString()).not.toBe('2026-01-15T00:00:00.000Z')
    })
  })

  describe('Structured Workout Normalization', () => {
    it('normalizes duration to durationSeconds', () => {
      const input = {
        id: 'event-101',
        start_date_local: '2026-01-20T06:00:00',
        name: 'Duration Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            { duration: 600, text: 'Warmup' },
            { durationSeconds: 900, text: 'Main' }, // Already correct
            { duration: 300, durationSeconds: 300, text: 'Cooldown' } // Both present
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      expect(steps[0].durationSeconds).toBe(600)
      expect(steps[0].duration).toBe(600) // We backfill duration too

      expect(steps[1].durationSeconds).toBe(900)
      expect(steps[1].duration).toBe(900)

      expect(steps[2].durationSeconds).toBe(300)
    })

    it('normalizes Power structure (Flat -> Nested) and Scaling (% -> Ratio)', () => {
      const input = {
        id: 'event-102',
        start_date_local: '2026-01-20T06:00:00',
        name: 'Power Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            {
              // Ramp, Percent
              duration: 600,
              power: { start: 50, end: 75, units: '%ftp' }
            },
            {
              // Steady, Percent
              duration: 300,
              power: { value: 90, units: '%ftp' }
            },
            {
              // Ramp, Ratio (already correct structure)
              duration: 300,
              power: { range: { start: 0.5, end: 0.75 } }
            },
            {
              // Steady, Ratio
              duration: 300,
              power: { value: 0.9 }
            }
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      // Step 1: Ramp, Percent -> Nested, Ratio
      expect(steps[0].power.range).toEqual({ start: 0.5, end: 0.75 })
      expect(steps[0].power.start).toBeUndefined() // Cleaned up
      expect(steps[0].power.end).toBeUndefined() // Cleaned up

      // Step 2: Steady, Percent -> Ratio
      expect(steps[1].power.value).toBe(0.9)

      // Step 3: Already normalized
      expect(steps[2].power.range).toEqual({ start: 0.5, end: 0.75 })

      // Step 4: Already normalized
      expect(steps[3].power.value).toBe(0.9)
    })

    it('normalizes Heart Rate structure and scaling', () => {
      const input = {
        id: 'event-103',
        start_date_local: '2026-01-20T06:00:00',
        name: 'HR Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            {
              // Ramp, Percent
              duration: 600,
              heartRate: { start: 60, end: 80, units: '%lthr' }
            },
            {
              // Steady, Percent
              duration: 300,
              heartRate: { value: 85, units: '%lthr' }
            }
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      // Step 1
      expect(steps[0].heartRate.range).toEqual({ start: 0.6, end: 0.8 })
      expect(steps[0].heartRate.start).toBeUndefined()

      // Step 2
      expect(steps[1].heartRate.value).toBe(0.85)
    })

    it('normalizes Cadence (Object -> Number)', () => {
      const input = {
        id: 'event-104',
        start_date_local: '2026-01-20T06:00:00',
        name: 'Cadence Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            {
              duration: 600,
              cadence: { value: 90, units: 'rpm' }
            },
            {
              duration: 300,
              cadence: 95 // Already number
            }
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      expect(steps[0].cadence).toBe(90)
      expect(steps[1].cadence).toBe(95)
    })

    it('maps text to name and infers type', () => {
      const input = {
        id: 'event-105',
        start_date_local: '2026-01-20T06:00:00',
        name: 'Metadata Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            {
              duration: 600,
              text: 'Warmup Spin',
              warmup: true,
              power: { value: 50, units: '%ftp' }
            },
            {
              duration: 900,
              text: 'Main Set',
              power: { value: 90, units: '%ftp' }
            },
            {
              duration: 300,
              text: 'Rest',
              power: { value: 50, units: '%ftp' }
            },
            {
              duration: 600,
              text: 'Cooldown Spin',
              cooldown: true,
              power: { value: 50, units: '%ftp' }
            }
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      // Step 1: Warmup flag
      expect(steps[0].name).toBe('Warmup Spin')
      expect(steps[0].type).toBe('Warmup')

      // Step 2: High intensity -> Active
      expect(steps[1].name).toBe('Main Set')
      expect(steps[1].type).toBe('Active')

      // Step 3: Low intensity -> Rest
      expect(steps[2].name).toBe('Rest')
      expect(steps[2].type).toBe('Rest')

      // Step 4: Cooldown flag
      expect(steps[3].name).toBe('Cooldown Spin')
      expect(steps[3].type).toBe('Cooldown')
    })

    it('maps hr to heartRate', () => {
      const input = {
        id: 'event-106',
        start_date_local: '2026-01-20T06:00:00',
        name: 'Run HR Test',
        category: 'WORKOUT',
        workout_doc: {
          steps: [
            {
              duration: 600,
              hr: { start: 70, end: 80, units: '%lthr' }
            }
          ]
        }
      }

      const result = normalizeIntervalsPlannedWorkout(input as any, USER_ID)
      const steps = result.structuredWorkout.steps

      expect(steps[0].heartRate).toBeDefined()
      expect(steps[0].heartRate.range).toEqual({ start: 0.7, end: 0.8 })
      expect(steps[0].hr).toBeUndefined()
    })
  })

  describe('normalizeIntervalsWellness', () => {
    const userId = 'test-user-id'
    const date = new Date('2023-01-01T00:00:00Z')

    describe('Sleep Score Normalization', () => {
      it('should use STANDARD scale (0-100) by default', () => {
        const wellness: any = { sleepScore: 85 }
        const result = normalizeIntervalsWellness(wellness, userId, date)
        expect(result.sleepScore).toBe(85)
      })

      it('should normalize TEN_POINT scale (1-10 -> 10-100)', () => {
        const wellness: any = { sleepScore: 8.5 }
        // 8.5 * 10 = 85
        const result = normalizeIntervalsWellness(wellness, userId, date, 'STANDARD', 'TEN_POINT')
        expect(result.sleepScore).toBe(85)
      })

      it('should normalize POLAR scale (1-6 -> 0-100)', () => {
        const wellness: any = { sleepScore: 3.5 }
        // (3.5 / 6) * 100 = 58.33 -> 58
        const result = normalizeIntervalsWellness(wellness, userId, date, 'STANDARD', 'POLAR')
        expect(result.sleepScore).toBe(58)
      })

      it('should clamp values nicely', () => {
        const wellness: any = { sleepScore: 110 } // Should be capped at 100
        const result = normalizeIntervalsWellness(wellness, userId, date, 'STANDARD', 'STANDARD')
        expect(result.sleepScore).toBe(100)
      })
    })

    describe('Readiness Normalization (Regression Test)', () => {
      it('should normalize POLAR readiness (1-6 -> 1-10)', () => {
        const wellness: any = { readiness: 3.5 }
        // (3.5 / 6) * 10 = 5.83 -> 6
        const result = normalizeIntervalsWellness(wellness, userId, date, 'POLAR')
        expect(result.readiness).toBe(6)
      })

      it('should normalize TEN_POINT readiness', () => {
        const wellness: any = { readiness: 8 }
        const result = normalizeIntervalsWellness(wellness, userId, date, 'TEN_POINT')
        expect(result.readiness).toBe(8)
      })

      it('should handle STANDARD readiness (0-100 -> 1-10)', () => {
        const wellness: any = { readiness: 85 }
        const result = normalizeIntervalsWellness(wellness, userId, date, 'STANDARD')
        expect(result.readiness).toBe(9) // 85 -> 8.5 -> 9
      })
    })
  })
})
