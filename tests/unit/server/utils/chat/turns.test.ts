import { describe, expect, it } from 'vitest'
import {
  buildToolIdempotencyKey,
  hashToolArgs,
  isMutatingChatTool
} from '../../../../../server/utils/chat/turns'

describe('isMutatingChatTool - structure tools (CW-23)', () => {
  it('classifies all planned-workout/plan structure tools as mutating', () => {
    expect(isMutatingChatTool('generate_planned_workout_structure')).toBe(true)
    expect(isMutatingChatTool('adjust_planned_workout')).toBe(true)
    expect(isMutatingChatTool('set_planned_workout_structure')).toBe(true)
    expect(isMutatingChatTool('modify_training_plan_structure')).toBe(true)
  })

  it('does not misclassify unrelated read tools as mutating', () => {
    expect(isMutatingChatTool('get_planned_workout_structure')).toBe(false)
    expect(isMutatingChatTool('get_workout_details')).toBe(false)
  })
})

describe('structure tool idempotency keys (CW-23)', () => {
  it.each([
    'generate_planned_workout_structure',
    'adjust_planned_workout',
    'set_planned_workout_structure'
  ])('produces the same idempotency key for repeated identical %s calls', (toolName) => {
    const args = { workoutId: 'w-1', steps: [{ durationSec: 300 }, { durationSec: 60 }] }

    const firstCallHash = hashToolArgs(args)
    const secondCallHash = hashToolArgs(args)
    expect(secondCallHash).toBe(firstCallHash)

    const firstKey = buildToolIdempotencyKey('lineage-1', toolName, firstCallHash)
    const secondKey = buildToolIdempotencyKey('lineage-1', toolName, secondCallHash)

    // Same lineage + same tool + same args must dedup to a single cached execution.
    expect(secondKey).toBe(firstKey)
  })

  it('produces a different key when the structure args actually change', () => {
    const toolName = 'set_planned_workout_structure'
    const keyForArgsA = buildToolIdempotencyKey(
      'lineage-1',
      toolName,
      hashToolArgs({ workoutId: 'w-1', steps: [{ durationSec: 300 }] })
    )
    const keyForArgsB = buildToolIdempotencyKey(
      'lineage-1',
      toolName,
      hashToolArgs({ workoutId: 'w-1', steps: [{ durationSec: 600 }] })
    )

    expect(keyForArgsB).not.toBe(keyForArgsA)
  })

  it('produces a different key for a different lineage even with identical args', () => {
    const toolName = 'generate_planned_workout_structure'
    const argsHash = hashToolArgs({ workoutId: 'w-1' })

    const keyLineageA = buildToolIdempotencyKey('lineage-a', toolName, argsHash)
    const keyLineageB = buildToolIdempotencyKey('lineage-b', toolName, argsHash)

    expect(keyLineageA).not.toBe(keyLineageB)
  })
})
