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

    it('formats loops correctly using Nx syntax', () => {
      const workout = {
        title: 'Intervals',
        description: '3x10min',
        steps: [
          {
            type: 'Warmup',
            durationSeconds: 600,
            power: { value: 0.5 },
            name: 'Warmup'
          },
          {
            reps: 3,
            steps: [
              {
                type: 'Active',
                durationSeconds: 600,
                power: { value: 0.95 },
                name: 'Effort'
              },
              {
                type: 'Rest',
                durationSeconds: 300,
                power: { value: 0.5 },
                name: 'Rest'
              }
            ]
          },
          {
            type: 'Cooldown',
            durationSeconds: 600,
            power: { value: 0.4 },
            name: 'Cooldown'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('Warmup')
      expect(result).toContain('- Warmup 10m 50%')
      expect(result).toContain('3x')
      expect(result).toContain(' - Effort 10m 95%')
      expect(result).toContain(' - Rest 5m 50%')
      expect(result).toContain('Cooldown')
      expect(result).toContain('- Cooldown 10m 40%')
    })

    it('handles deeply nested loops (3 levels)', () => {
      const workout = {
        title: 'Deep Loops',
        steps: [
          {
            reps: 2,
            steps: [
              {
                reps: 3,
                steps: [
                  { type: 'Active', durationSeconds: 60, power: { value: 1.2 }, name: 'Sprint' },
                  { type: 'Rest', durationSeconds: 60, power: { value: 0.5 }, name: 'Recover' }
                ]
              },
              { type: 'Rest', durationSeconds: 300, power: { value: 0.5 }, name: 'Set Break' }
            ]
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('2x')
      expect(result).toContain(' 3x')
      expect(result).toContain('  - Sprint 1m 120%')
      expect(result).toContain('  - Recover 1m 50%')
      expect(result).toContain(' - Set Break 5m 50%')
    })

    it('handles very deeply nested loops (4 levels)', () => {
      const workout = {
        title: 'Deepest Loops',
        steps: [
          {
            reps: 2,
            steps: [
              {
                reps: 2,
                steps: [
                  {
                    reps: 2,
                    steps: [
                      { type: 'Active', durationSeconds: 30, power: { value: 1.5 }, name: 'Micro' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('2x')
      expect(result).toContain(' 2x')
      expect(result).toContain('  2x')
      expect(result).toContain('   - Micro 30s 150%')
    })

    it('ignores loops with reps <= 1', () => {
      const workout = {
        title: 'Single Rep Loop',
        steps: [
          {
            reps: 1,
            steps: [{ type: 'Active', durationSeconds: 600, power: { value: 0.8 }, name: 'Steady' }]
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).not.toContain('1x')
      expect(result).toContain('- Steady 10m 80%')
    })

    it('formats Swimming workouts correctly', () => {
      const workout = {
        title: 'Swim Set',
        type: 'Swim',
        steps: [
          { type: 'Warmup', distance: 400, heartRate: { value: 0.6 }, name: 'Mixed' },
          {
            reps: 4,
            steps: [
              { type: 'Active', distance: 100, pace: { value: 0.9 }, name: 'Hard' },
              { type: 'Rest', durationSeconds: 30, name: 'Rest' }
            ]
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('- Mixed 400mtrs 60% LTHR')
      expect(result).toContain('4x')
      expect(result).toContain(' - Hard 100mtrs 90% Pace')
      expect(result).toContain(' - Rest 30s')
    })
    it('prioritizes Heart Rate when sportSettings loadPreference is hr', () => {
      const workout = {
        title: 'HR Focus',
        sportSettings: { loadPreference: 'hr' },
        steps: [
          {
            type: 'Active',
            durationSeconds: 300,
            power: { value: 0.8 },
            heartRate: { value: 0.75 },
            name: 'Steady'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      // HR should be the only exported primary metric
      expect(result).toContain('75% LTHR')
      expect(result).not.toContain('80%')
    })

    it('preserves absolute target units for Intervals export', () => {
      const workout = {
        title: 'Absolute Units',
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            power: { range: { start: 220, end: 260 }, units: 'w' },
            name: 'Steady'
          },
          {
            type: 'Active',
            durationSeconds: 300,
            heartRate: { value: 165, units: 'bpm' },
            name: 'HR Push'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)
      expect(result).toContain('- Steady 10m 220-260w')
      expect(result).toContain('- HR Push 5m 165bpm')
    })

    it('preserves power zone targets for Intervals export', () => {
      const workout = {
        title: 'Zone Targets',
        steps: [
          {
            type: 'Active',
            durationSeconds: 300,
            power: { value: 1, units: 'power_zone' },
            name: 'Recovery'
          },
          {
            type: 'Active',
            durationSeconds: 1800,
            power: { value: 2, units: 'power_zone' },
            name: 'Endurance'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)
      expect(result).toContain('- Recovery 5m Z1')
      expect(result).toContain('- Endurance 30m Z2')
    })

    it('exports explicit heart-rate ranges for steady-state steps', () => {
      const workout = {
        title: 'Run Z2',
        type: 'Run',
        steps: [
          {
            type: 'Active',
            durationSeconds: 1800,
            heartRate: { range: { start: 0.75, end: 0.85 } },
            name: 'Endurance'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)
      expect(result).toContain('- Endurance 30m 75-85% LTHR')
    })

    it('can convert single HR targets into ranges using tolerance setting', () => {
      const workout = {
        title: 'Run Steady',
        type: 'Run',
        sportSettings: { intervalsHrRangeTolerancePct: 0.02 },
        steps: [
          {
            type: 'Active',
            durationSeconds: 1200,
            heartRate: { value: 0.8 },
            name: 'Steady'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)
      expect(result).toContain('- Steady 20m 78-82% LTHR')
    })

    it('cleans up description preamble correctly', () => {
      const workout = {
        title: 'Clean Desc',
        description: 'Focus on technique.\n- This bullet should be removed.\nEnjoy!',
        steps: [{ type: 'Active', durationSeconds: 600, power: { value: 0.7 }, name: 'Main' }]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)

      expect(result).toContain('Focus on technique.\nEnjoy!')
      expect(result).not.toContain('This bullet should be removed')
      expect(result).toContain('- Main 10m 70%')
    })

    it('handles ramps with ramp prefix', () => {
      const workout = {
        title: 'Ramp',
        steps: [
          {
            type: 'Warmup',
            durationSeconds: 300,
            power: { range: { start: 0.4, end: 0.6 } },
            name: 'Build'
          }
        ]
      }

      const result = WorkoutConverter.toIntervalsICU(workout as any)
      expect(result).toContain('ramp 40-60%')
    })
  })

  describe('parseIntervalsGymDescription', () => {
    it('parses formatted description back to exercises', () => {
      const description = `
- **Barbell Bench Press**
  - 3 sets x 5-7 reps @ Heavy (RPE 8)
  - Rest: 120s
  - Note: Control the descent.

- **Pull-ups**
  - 3 sets x AMRAP reps @ Bodyweight
      `

      const result = WorkoutConverter.parseIntervalsGymDescription(description)

      expect(result).toHaveLength(2)

      expect(result[0].name).toBe('Barbell Bench Press')
      expect(result[0].sets).toBe(3)
      expect(result[0].reps).toBe('5-7')
      expect(result[0].weight).toBe('Heavy (RPE 8)')
      expect(result[0].rest).toBe('120s')
      expect(result[0].notes).toBe('Control the descent.')

      expect(result[1].name).toBe('Pull-ups')
      expect(result[1].sets).toBe(3)
      expect(result[1].reps).toBe('AMRAP')
      expect(result[1].weight).toBe('Bodyweight')
    })
  })
})
