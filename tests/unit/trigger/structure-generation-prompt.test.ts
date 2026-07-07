import { describe, expect, it } from 'vitest'

import { resolveStructureGeneratorModeForWorkout } from '../../../server/utils/structured-workout-generator'
import {
  buildCorrectiveStructureRetryPrompt,
  buildStructureAiCallOptions,
  formatAiContextForStructureGen
} from '../../../trigger/utils/structure-generation-prompt'
import { formatCompactTargetingBlock } from '../../../trigger/utils/workout-targeting'
import { normalizeTargetFormatPolicy } from '../../../server/utils/workout-target-format-policy'
import { normalizeTargetPolicy } from '../../../server/utils/workout-target-policy'

describe('structure generation prompt helpers', () => {
  it('caps aiContext and skips when description is long enough', () => {
    const longContext = 'x'.repeat(800)
    expect(formatAiContextForStructureGen({ aiContext: longContext })).toContain('…')
    expect(formatAiContextForStructureGen({ aiContext: longContext })).not.toContain(
      'x'.repeat(800)
    )

    expect(
      formatAiContextForStructureGen({
        aiContext: 'Prefer cadence 85-90 on endurance rides.',
        workoutDescription: 'A'.repeat(150)
      })
    ).toBe('')
  })

  it('builds a compact targeting block once', () => {
    const targetPolicy = normalizeTargetPolicy({
      primaryMetric: 'power',
      fallbackOrder: ['power', 'heartRate', 'rpe'],
      strictPrimary: false,
      allowMixedTargetsPerStep: false,
      defaultTargetStyle: 'value'
    })
    const targetFormatPolicy = normalizeTargetFormatPolicy(null)
    const block = formatCompactTargetingBlock(targetPolicy, targetFormatPolicy, 'POWER > HR > RPE')

    expect(block).toContain('primary=Power')
    expect(block).toContain('order=POWER > HR > RPE')
    expect(block).not.toContain('TARGET POLICY (source')
  })

  it('forces draft mode for endurance sports only', () => {
    expect(resolveStructureGeneratorModeForWorkout('Run')).toBe('draft_json_v1')
    expect(resolveStructureGeneratorModeForWorkout('Ride')).toBe('draft_json_v1')
    expect(resolveStructureGeneratorModeForWorkout('Swim')).toBe('draft_json_v1')
    expect(resolveStructureGeneratorModeForWorkout('WeightTraining')).toBe('legacy_json')
  })

  it('builds lightweight corrective retry prompts with previous draft', () => {
    const prompt = buildCorrectiveStructureRetryPrompt({
      workout: { title: 'Z2 Ride', type: 'Ride', durationSec: 3600 },
      reason: 'duration undershoot too low',
      previousDraft: { steps: [{ type: 'Warmup', name: 'Easy', durationSeconds: 600 }] },
      generatorMode: 'draft_json_v1'
    })

    expect(prompt).toContain('FAILURE: duration undershoot too low')
    expect(prompt).toContain('PREVIOUS DRAFT')
    expect(prompt).toContain('compact JSON')
    expect(prompt.length).toBeLessThan(2000)
  })

  it('disables thinking on first attempt and uses low thinking on retry', () => {
    const first = buildStructureAiCallOptions({
      attempt: 1,
      userId: 'user-1',
      operation: 'generate_structured_workout',
      entityType: 'PlannedWorkout',
      entityId: 'pw-1',
      timeoutMs: 45_000
    })
    const second = buildStructureAiCallOptions({
      attempt: 2,
      userId: 'user-1',
      operation: 'generate_structured_workout',
      entityType: 'PlannedWorkout',
      entityId: 'pw-1',
      timeoutMs: 45_000
    })

    expect(first.disableThinking).toBe(true)
    expect(first.modelOverride).toBeUndefined()
    expect(second.modelOverride).toBe('gemini-3-pro-preview')
    expect(second.thinkingLevelOverride).toBe('low')
    expect(second.disableThinking).toBeUndefined()
  })
})
