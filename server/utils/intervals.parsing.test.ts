import { normalizeIntervalsPlannedWorkout } from './intervals'
import { WorkoutConverter } from './workout-converter'
import { WorkoutParser } from './workout-parser'
import { describe, it, expect } from 'vitest'

// Mock minimal event structure
const createEvent = (steps: any[], type = 'Ride', overrides: Record<string, any> = {}) => ({
  id: 'test-id',
  start_date_local: '2025-01-01T00:00:00',
  name: 'Test Workout',
  type,
  category: 'WORKOUT',
  workout_doc: { steps },
  ...overrides
})

describe('Intervals.icu Parsing Logic', () => {
  describe('Cadence Normalization', () => {
    it('should handle simple number cadence', () => {
      const event = createEvent([{ duration: 60, cadence: 90 }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].cadence).toBe(90)
    })

    it('should handle object cadence with value', () => {
      const event = createEvent([{ duration: 60, cadence: { value: 90, units: 'rpm' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].cadence).toBe(90)
    })

    it('should normalize cadence range to average', () => {
      const event = createEvent([{ duration: 60, cadence: { start: 80, end: 100, units: 'rpm' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].cadence).toBe(90) // (80+100)/2
    })

    it('should handle missing/invalid cadence gracefully', () => {
      const event = createEvent([{ duration: 60, cadence: { foo: 'bar' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].cadence).toBeUndefined()
    })
  })

  describe('Power Normalization', () => {
    it('should normalize %ftp to ratio (value > 5)', () => {
      const event = createEvent([{ duration: 60, power: { value: 90, units: '%ftp' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].power.value).toBe(0.9)
    })

    it('should normalize %ftp to ratio (explicit units)', () => {
      const event = createEvent([{ duration: 60, power: { value: 0.9, units: '%ftp' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].power.value).toBeCloseTo(0.9) // Fixed: should not divide by 100 if already ratio
    })

    it('should normalize power range with %ftp', () => {
      const event = createEvent([{ duration: 60, power: { start: 80, end: 100, units: '%ftp' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const step = result.structuredWorkout.steps[0]
      expect(step.power.range.start).toBe(0.8)
      expect(step.power.range.end).toBe(1.0)
      expect(step.power.start).toBeUndefined() // Should clean up
    })

    it('should keep watts as absolute values', () => {
      const event = createEvent([{ duration: 60, power: { value: 200, units: 'w' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].power.value).toBe(200)
    })

    it('should keep watts range as absolute values', () => {
      const event = createEvent([{ duration: 60, power: { start: 200, end: 300, units: 'w' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const step = result.structuredWorkout.steps[0]
      expect(step.power.range.start).toBe(200)
      expect(step.power.range.end).toBe(300)
    })
  })

  describe('Nested Steps (Repeats)', () => {
    it('should process nested steps recursively', () => {
      const event = createEvent([
        {
          reps: 3,
          steps: [
            { duration: 300, power: { start: 90, end: 100, units: '%ftp' } }, // Active
            { duration: 120, power: { value: 50, units: '%ftp' } } // Rest
          ]
        }
      ])

      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const parentStep = result.structuredWorkout.steps[0]
      const activeStep = parentStep.steps[0]
      const restStep = parentStep.steps[1]

      // Check Active Step normalization
      expect(activeStep.power.range.start).toBe(0.9)
      expect(activeStep.power.range.end).toBe(1.0)
      expect(activeStep.type).toBe('Active') // > 60% intensity

      // Check Rest Step normalization
      expect(restStep.power.value).toBe(0.5)
      expect(restStep.type).toBe('Rest') // < 60% intensity
    })

    it('should handle deeply nested steps', () => {
      const event = createEvent([
        {
          reps: 2,
          steps: [
            {
              reps: 3,
              steps: [{ duration: 30, power: { value: 150, units: '%ftp' } }]
            }
          ]
        }
      ])

      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const innerStep = result.structuredWorkout.steps[0].steps[0].steps[0]

      expect(innerStep.power.value).toBe(1.5)
    })

    it('preserves rest steps labeled OFF after export/import round-trip', () => {
      const text = WorkoutConverter.toIntervalsICU({
        title: 'Bike Intervals',
        description: '',
        type: 'Ride',
        steps: [
          {
            type: 'Active',
            reps: 3,
            steps: [
              { type: 'Active', name: 'ON', durationSeconds: 120, power: { value: 1, units: '%' } },
              { type: 'Rest', name: 'OFF', durationSeconds: 60, power: { value: 0.5, units: '%' } }
            ]
          }
        ]
      } as any)

      const event = createEvent(WorkoutParser.parseIntervalsICU(text))
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const offStep = result.structuredWorkout.steps[0].steps[1]

      expect(offStep.name).toBe('OFF')
      expect(offStep.type).toBe('Rest')
    })

    it('preserves run recovery jog steps and removes metric label noise after round-trip', () => {
      const text = WorkoutConverter.toIntervalsICU({
        title: 'Run Intervals',
        description: '',
        type: 'Run',
        steps: [
          {
            type: 'Active',
            reps: 2,
            steps: [
              {
                type: 'Active',
                name: 'Tempo',
                durationSeconds: 300,
                heartRate: { range: { start: 0.82, end: 0.88 }, units: 'LTHR' }
              },
              {
                type: 'Rest',
                name: 'Jog',
                durationSeconds: 120,
                heartRate: { value: 0.65, units: 'LTHR' }
              }
            ]
          }
        ]
      } as any)

      const event = createEvent(WorkoutParser.parseIntervalsICU(text), 'Run')
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const steps = result.structuredWorkout.steps[0].steps

      expect(steps[0].name).toBe('Tempo')
      expect(steps[0].type).toBe('Active')
      expect(steps[1].name).toBe('Jog')
      expect(steps[1].type).toBe('Rest')
    })
  })

  describe('Swim Distance Handling', () => {
    it('parses bare swim meter tokens as distance instead of minutes', () => {
      const steps = WorkoutParser.parseIntervalsICU(
        '4x\n  - 200m 73-77% LTHR\n  - Recupero Facile 40s 58-62% LTHR',
        { workoutType: 'Swim' }
      )
      const workStep = steps[0]?.steps?.[0]

      expect(workStep?.distance).toBe(200)
      expect(workStep?.durationSeconds).toBeUndefined()
    })

    it('keeps non-swim bare m tokens as minutes', () => {
      const steps = WorkoutParser.parseIntervalsICU('- Steady 10m 70%', { workoutType: 'Ride' })
      expect(steps[0]?.durationSeconds).toBe(600)
      expect(steps[0]?.distance).toBeUndefined()
    })

    it('repairs swim distances embedded in step names during generation/import round-trip', () => {
      const event = createEvent(
        [
          {
            reps: 4,
            steps: [
              { type: 'Active', name: '400m Crawl Tempo', durationSeconds: 480 },
              { type: 'Active', name: '100m Pull Buoy', durationSeconds: 120 }
            ]
          }
        ],
        'Swim'
      )

      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const reps = result.structuredWorkout.steps[0]

      expect(reps.steps[0].distance).toBe(400)
      expect(reps.steps[0].name).toBe('Crawl Tempo')
      expect(reps.steps[1].distance).toBe(100)
      expect(reps.steps[1].name).toBe('Pull Buoy')
      expect(reps.distance).toBe(2000)
    })

    it('reparses suspicious remote swim descriptions when workout_doc lost distances', () => {
      const event = createEvent(
        [
          {
            reps: 4,
            type: 'Active',
            steps: [
              { type: 'Rest', durationSeconds: 24000 },
              { type: 'Rest', durationSeconds: 6000 }
            ],
            durationSeconds: 120000
          }
        ],
        'Swim',
        {
          description:
            'Warmup\n- Échauffement progressif 5m\n\nMain Set\n4x\n  - 400m Crawl Tempo 8m RPE 6\n  - 100m Pull Buoy & Pads 2m RPE 7\n\nCooldown\n- Retour au calme 5m'
        }
      )

      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      const reps = result.structuredWorkout.steps[1]

      expect(reps.steps[0].distance).toBe(400)
      expect(reps.steps[0].durationSeconds).toBe(480)
      expect(reps.steps[1].distance).toBe(100)
      expect(reps.steps[1].durationSeconds).toBe(120)
    })
  })

  describe('Type Inference', () => {
    it('should infer Warmup and Cooldown from flags', () => {
      const event = createEvent([
        { duration: 600, warmup: true },
        { duration: 600, cooldown: true }
      ])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].type).toBe('Warmup')
      expect(result.structuredWorkout.steps[1].type).toBe('Cooldown')
    })

    it('should infer Rest based on low intensity (<60%)', () => {
      const event = createEvent([{ duration: 600, power: { value: 50, units: '%ftp' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].type).toBe('Rest')
    })

    it('should infer Active based on high intensity (>=60%)', () => {
      const event = createEvent([{ duration: 600, power: { value: 70, units: '%ftp' } }])
      const result = normalizeIntervalsPlannedWorkout(event as any, 'user-1')
      expect(result.structuredWorkout.steps[0].type).toBe('Active')
    })
  })
})
