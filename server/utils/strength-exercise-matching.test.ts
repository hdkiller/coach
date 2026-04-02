import { describe, expect, it } from 'vitest'
import {
  applyMatchedLibraryDefaultsToStrengthStep,
  findDeterministicStrengthExerciseMatch,
  getStrengthExerciseMatchCandidates,
  normalizeExerciseMatchKey,
  validateStrengthStructuredWorkout
} from './strength-exercise-matching'

describe('strength exercise matching', () => {
  it('normalizes safe abbreviations for matching', () => {
    expect(normalizeExerciseMatchKey('DB Walking Lunge')).toBe('dumbbell walking lunge')
    expect(normalizeExerciseMatchKey('BB Split Squat')).toBe('barbell split squat')
  })

  it('matches exact, normalized, and alias exercise names deterministically', () => {
    const libraryExercises = [
      {
        id: '1',
        title: 'Romanian Deadlift',
        aliases: ['RDL']
      },
      {
        id: '2',
        title: 'Back Squat',
        aliases: ['BB Back Squat']
      }
    ]

    expect(
      findDeterministicStrengthExerciseMatch({ name: 'Back Squat' }, libraryExercises)?.id
    ).toBe('2')
    expect(
      findDeterministicStrengthExerciseMatch({ name: 'Romanian-Deadlift' }, libraryExercises)?.id
    ).toBe('1')
    expect(findDeterministicStrengthExerciseMatch({ name: 'RDL' }, libraryExercises)?.id).toBe('1')
  })

  it('returns no deterministic match when multiple aliases collide', () => {
    const libraryExercises = [
      {
        id: '1',
        title: 'Romanian Deadlift',
        aliases: ['RDL']
      },
      {
        id: '2',
        title: 'Single Leg Romanian Deadlift',
        aliases: ['RDL']
      }
    ]

    expect(findDeterministicStrengthExerciseMatch({ name: 'RDL' }, libraryExercises)).toBeNull()
  })

  it('builds a small lexical candidate list for llm fallback', () => {
    const candidates = getStrengthExerciseMatchCandidates({ name: 'DB Walking Lunge' }, [
      { id: '1', title: 'Dumbbell Walking Lunge' },
      { id: '2', title: 'Chest Supported Row' },
      { id: '3', title: 'Bodyweight Split Squat' }
    ])

    expect(candidates.map((candidate) => candidate.id)).toEqual(['1'])
  })

  it('rejects coarse duration-based strength output for loaded lifts', () => {
    const validation = validateStrengthStructuredWorkout(
      {
        blocks: [
          {
            type: 'single_exercise',
            title: 'Main Lift',
            steps: [
              {
                name: 'Barbell Back Squat',
                prescriptionMode: 'duration',
                setRows: [{ value: '900' }]
              }
            ]
          }
        ]
      },
      {
        blocks: [
          {
            type: 'single_exercise',
            title: 'Main Lift',
            steps: [
              {
                name: 'Barbell Back Squat',
                prescriptionMode: 'duration',
                setRows: [{ value: '900' }]
              }
            ]
          }
        ]
      }
    )

    expect(validation).toEqual({
      valid: false,
      reason: 'loaded lift "Barbell Back Squat" should not use duration-based sets'
    })
  })

  it('applies matched library defaults only when the generated step is weak', () => {
    const nextStep = applyMatchedLibraryDefaultsToStrengthStep(
      {
        id: 'step-1',
        name: 'Back Squat',
        notes: 'Keep chest up.',
        prescriptionMode: 'duration',
        loadMode: 'none',
        setRows: [{ id: 'set-1', index: 1, value: '900', loadValue: '', restOverride: '' }]
      },
      {
        id: 'lib-1',
        title: 'Back Squat',
        movementPattern: 'squat',
        prescriptionMode: 'reps',
        loadMode: 'weight_kg',
        defaultRest: '120s',
        setRows: [
          { id: 'a', index: 1, value: '5', loadValue: '80', restOverride: '' },
          { id: 'b', index: 2, value: '5', loadValue: '85', restOverride: '' },
          { id: 'c', index: 3, value: '5', loadValue: '90', restOverride: '' }
        ]
      }
    )

    expect(nextStep.libraryExerciseId).toBe('lib-1')
    expect(nextStep.notes).toBe('Keep chest up.')
    expect(nextStep.prescriptionMode).toBe('reps')
    expect(nextStep.loadMode).toBe('weight_kg')
    expect(nextStep.defaultRest).toBe('120s')
    expect(nextStep.setRows).toHaveLength(3)
    expect(nextStep.setRows[0]?.value).toBe('5')
  })
})
