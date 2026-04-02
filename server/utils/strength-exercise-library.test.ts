import { describe, expect, it } from 'vitest'
import {
  flattenStrengthBlocksToExercises,
  normalizeStrengthExerciseLibraryItem,
  normalizeStructuredStrengthExercise,
  normalizeStructuredStrengthBlocks,
  normalizeStructuredStrengthExercises,
  normalizeStructuredStrengthWorkout,
  normalizeYouTubeUrl
} from './strength-exercise-library'

describe('strength exercise library utils', () => {
  it('normalizes supported YouTube URLs', () => {
    expect(normalizeYouTubeUrl('https://youtu.be/abc123XYZ98')).toBe(
      'https://www.youtube.com/watch?v=abc123XYZ98'
    )
    expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=abc123XYZ98&t=30')).toBe(
      'https://www.youtube.com/watch?v=abc123XYZ98'
    )
  })

  it('rejects unsupported video providers', () => {
    expect(() =>
      normalizeStrengthExerciseLibraryItem({
        title: 'Back Squat',
        videoUrl: 'https://vimeo.com/12345'
      })
    ).toThrow('Only valid YouTube URLs are supported for exercise videos')
  })

  it('normalizes structured strength exercises with references and video URLs', () => {
    const exercise = normalizeStructuredStrengthExercise({
      name: 'Romanian Deadlift',
      group: 'Main Lifts',
      libraryExerciseId: 'lib-1',
      videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ98',
      sets: 4,
      reps: '8',
      rpe: 7.5
    })

    expect(exercise).toMatchObject({
      name: 'Romanian Deadlift',
      group: 'Main Lifts',
      libraryExerciseId: 'lib-1',
      videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ98',
      sets: 4,
      reps: '8',
      rpe: 7.5,
      prescriptionMode: 'reps',
      loadMode: 'none'
    })
    expect(exercise.setRows).toHaveLength(4)
  })

  it('normalizes arrays of structured strength exercises', () => {
    const exercises = normalizeStructuredStrengthExercises([
      {
        name: 'Goblet Squat',
        videoUrl: 'https://youtu.be/abc123XYZ98'
      }
    ])

    expect(exercises).toHaveLength(1)
    expect(exercises[0]).toMatchObject({
      name: 'Goblet Squat',
      videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ98',
      sets: 1,
      prescriptionMode: 'reps',
      loadMode: 'none'
    })
    expect(exercises[0]?.setRows).toHaveLength(1)
  })

  it('preserves target muscle groups on saved and structured strength exercises', () => {
    const normalizedLibraryItem = normalizeStrengthExerciseLibraryItem({
      title: 'Romanian Deadlift',
      targetMuscleGroups: ['hamstrings', 'glutes', 'hamstrings']
    })

    expect(normalizedLibraryItem.targetMuscleGroups).toEqual(['hamstrings', 'glutes'])

    const structured = normalizeStructuredStrengthExercise({
      name: 'Romanian Deadlift',
      targetMuscleGroups: ['hamstrings', 'glutes']
    })

    expect(structured.targetMuscleGroups).toEqual(['hamstrings', 'glutes'])
  })

  it('normalizes aliases and removes duplicates of the title', () => {
    const normalizedLibraryItem = normalizeStrengthExerciseLibraryItem({
      title: 'Romanian Deadlift',
      aliases: ['RDL', 'Romanian Deadlift', 'BB RDL', 'RDL']
    })

    expect(normalizedLibraryItem.aliases).toEqual(['RDL', 'BB RDL'])
  })

  it('normalizes legacy grouped exercises into blocks and back again', () => {
    const blocks = normalizeStructuredStrengthBlocks(undefined, [
      {
        name: 'Foam Roll',
        group: 'Warm Up',
        duration: 60
      },
      {
        name: 'Back Squat',
        group: 'Main Lifts',
        sets: 3,
        reps: '5'
      }
    ])

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({
      type: 'warmup',
      title: 'Warm Up'
    })
    expect(blocks[0].steps[0]).toMatchObject({
      name: 'Foam Roll',
      prescriptionMode: 'duration'
    })
    expect(blocks[0].steps[0].setRows).toHaveLength(1)
    expect(blocks[0].steps[0].setRows[0]?.value).toBe('60')

    expect(flattenStrengthBlocksToExercises(blocks)).toEqual([
      {
        id: blocks[0].steps[0].id,
        group: 'Warm Up',
        name: 'Foam Roll',
        prescriptionType: 'duration',
        sets: 1,
        duration: 60
      },
      {
        id: blocks[1].steps[0].id,
        group: 'Main Lifts',
        name: 'Back Squat',
        prescriptionType: 'reps',
        sets: 3,
        reps: '5'
      }
    ])
  })

  it('normalizes structured strength workouts into blocks and exercises', () => {
    const structuredWorkout = normalizeStructuredStrengthWorkout({
      blocks: [
        {
          type: 'superset',
          title: 'Superset',
          steps: [
            {
              name: 'Plank',
              prescriptionMode: 'duration',
              setRows: [{ value: '45' }]
            }
          ]
        }
      ]
    })

    expect(structuredWorkout.blocks).toHaveLength(1)
    expect(structuredWorkout.exercises).toEqual([
      {
        id: structuredWorkout.blocks[0].steps[0].id,
        group: 'Superset',
        name: 'Plank',
        prescriptionType: 'duration',
        sets: 1,
        duration: 45
      }
    ])
  })

  it('converts legacy interval-style strength steps into visible strength blocks', () => {
    const structuredWorkout = normalizeStructuredStrengthWorkout({
      steps: [
        {
          type: 'Warmup',
          name: 'Dynamic Leg Warmup',
          intent: 'warmup',
          rpe: 3,
          durationSeconds: 600
        },
        {
          type: 'Active',
          name: 'Barbell Back Squats',
          intent: 'easy',
          rpe: 7,
          durationSeconds: 900
        }
      ]
    })

    expect(structuredWorkout.blocks).toHaveLength(2)
    expect(structuredWorkout.blocks[0]).toMatchObject({
      type: 'warmup',
      title: 'Dynamic Leg Warmup'
    })
    expect(structuredWorkout.blocks[0].steps[0]).toMatchObject({
      name: 'Dynamic Leg Warmup',
      prescriptionMode: 'duration'
    })
    expect(structuredWorkout.blocks[0].steps[0]?.setRows?.[0]?.value).toBe('600')
    expect(structuredWorkout.blocks[1].steps[0]?.setRows?.[0]?.value).toBe('900')
    expect(structuredWorkout.exercises).toHaveLength(2)
    expect(structuredWorkout.exercises[0]).toMatchObject({
      group: 'Dynamic Leg Warmup',
      name: 'Dynamic Leg Warmup',
      duration: 600
    })
  })
})
