import { describe, it, expect } from 'vitest'
import { WorkoutConverter } from './workout-converter'

describe('WorkoutConverter', () => {
  describe('toIntervalsICU', () => {
    it('formats Gym exercises correctly with nested bullets', () => {
      const workout = {
        title: 'Strength Session',
        description: 'Gym day',
        steps: [],
        exercises: [
          {
            name: 'Bench Press',
            sets: 3,
            reps: '5',
            weight: '80kg',
            rest: '2m',
            notes: 'Go heavy'
          },
          {
            name: 'Pull-ups',
            sets: 3,
            reps: 'AMRAP',
            notes: 'Strict form'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      // Check first exercise
      expect(result).toContain('- **Bench Press**')
      expect(result).toContain('  - 3 sets x 5 reps @ 80kg')
      expect(result).toContain('  - Rest: 2m')
      expect(result).toContain('  - Note: Go heavy')

      // Check second exercise
      expect(result).toContain('- **Pull-ups**')
      expect(result).toContain('  - 3 sets x AMRAP reps')
      expect(result).toContain('  - Note: Strict form')

      // Check spacing
      const lines = result.split('\n')
      expect(lines.filter((l) => l === '').length).toBeGreaterThan(0)
    })

    it('formats endurance steps correctly', () => {
      const workout = {
        title: 'Ride',
        description: 'Cycling',
        steps: [
          {
            type: 'Warmup',
            durationSeconds: 600,
            power: { range: { start: 0.5, end: 0.7 } },
            name: 'Warmup'
          },
          { type: 'Active', durationSeconds: 1200, power: { value: 0.9 }, name: 'Interval' }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('Warmup')
      expect(result).toContain('- Warmup 10m ramp 50-70%')
      expect(result).toContain('Main Set')
      expect(result).toContain('- Interval 20m 90%')
    })
  })
})
