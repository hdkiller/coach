import { describe, expect, it } from 'vitest'
import { hasValidRepeatBlockRecovery } from '../../../server/utils/structured-workout-validation'
import {
  buildDraftOutputRules,
  buildLegacyStructureInstructions,
  buildSportSpecificInstructions
} from '../../../trigger/utils/structure-generation-prompt'
import { normalizeTargetFormatPolicy } from '../../../server/utils/workout-target-format-policy'

describe('Structured Workout Generator - Repeat Block Recovery Validation', () => {
  describe('hasValidRepeatBlockRecovery', () => {
    it('accepts valid repeat blocks with non-zero recovery rest steps', () => {
      const steps = [
        { type: 'Warmup', name: 'Warm Up', durationSeconds: 600 },
        {
          reps: 4,
          name: 'Threshold Set',
          steps: [
            { type: 'Active', name: '8min Threshold', durationSeconds: 480 },
            { type: 'Rest', name: '2min Rest', durationSeconds: 120 }
          ]
        },
        { type: 'Cooldown', name: 'Cool Down', durationSeconds: 300 }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('rejects repeat blocks containing only Active work steps without recovery', () => {
      const steps = [
        { type: 'Warmup', name: 'Warm Up', durationSeconds: 600 },
        {
          reps: 4,
          name: '4x8min Threshold Continuous Work',
          steps: [{ type: 'Active', name: '8min Threshold', durationSeconds: 480 }]
        },
        { type: 'Cooldown', name: 'Cool Down', durationSeconds: 300 }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('lacks recovery/rest steps')
      expect(result.reason).toContain('4x8min Threshold Continuous Work')
    })

    it('rejects repeat blocks where rest step duration is zero', () => {
      const steps = [
        {
          reps: 4,
          name: 'Zero Rest Set',
          steps: [
            { type: 'Active', name: '8min Threshold', durationSeconds: 480 },
            { type: 'Rest', name: '0min Rest', durationSeconds: 0 }
          ]
        }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('lacks recovery/rest steps')
    })

    it('accepts repeat blocks with explicit restSeconds > 0', () => {
      const steps = [
        {
          reps: 5,
          name: 'Swim Set',
          steps: [{ type: 'Active', name: '100m Free', distanceMeters: 100, restSeconds: 30 }]
        }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('accepts repeat blocks with intent="recovery" or intent="rest"', () => {
      const steps = [
        {
          reps: 3,
          name: 'VO2 Max Set',
          steps: [
            { type: 'Active', intent: 'vo2', name: '3min VO2', durationSeconds: 180 },
            { type: 'Active', intent: 'recovery', name: '3min Easy Spin', durationSeconds: 180 }
          ]
        }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('rejects nested repeat blocks lacking recovery', () => {
      const steps = [
        {
          type: 'Active',
          name: 'Main Block',
          steps: [
            {
              reps: 3,
              name: 'Nested Hard Efforts',
              steps: [{ type: 'Active', name: '3min Hard', durationSeconds: 180 }]
            }
          ]
        }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Nested Hard Efforts')
    })

    it('passes structures without any repeat blocks', () => {
      const steps = [
        { type: 'Warmup', name: 'Warm Up', durationSeconds: 600 },
        { type: 'Active', name: 'Steady Z2', durationSeconds: 2400 },
        { type: 'Cooldown', name: 'Cool Down', durationSeconds: 600 }
      ]

      const result = hasValidRepeatBlockRecovery(steps)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeNull()
    })
  })

  describe('Prompt instructions for repeat block recovery', () => {
    it('buildDraftOutputRules includes mandatory recovery rules for repeat blocks', () => {
      const rules = buildDraftOutputRules({ preserveExistingStructure: false })
      expect(rules).toContain('reps > 1')
      expect(rules).toContain('non-zero recovery/rest steps')
    })

    it('buildLegacyStructureInstructions includes mandatory recovery rules for repeat blocks', () => {
      const instructions = buildLegacyStructureInstructions({
        workoutType: 'Ride',
        durationMinutes: 60,
        mode: 'generate',
        persona: 'Supportive'
      })
      expect(instructions).toContain('reps > 1')
      expect(instructions).toContain('non-zero recovery/rest steps')
    })

    it('buildSportSpecificInstructions includes recovery instructions for cycling and running', () => {
      const targetFormatPolicy = normalizeTargetFormatPolicy(null)
      const cyclingRules = buildSportSpecificInstructions({
        workoutType: 'Ride',
        targetFormatPolicy,
        steadyTargetStyleRule: 'Prefer metric ranges'
      })
      const runningRules = buildSportSpecificInstructions({
        workoutType: 'Run',
        targetFormatPolicy,
        steadyTargetStyleRule: 'Prefer metric ranges'
      })

      expect(cyclingRules).toContain(
        'Repeat blocks (reps > 1) MUST contain non-zero recovery/rest steps'
      )
      expect(runningRules).toContain(
        'Repeat blocks (reps > 1) MUST contain non-zero recovery/rest steps'
      )
    })
  })
})
