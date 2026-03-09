import { describe, expect, it } from 'vitest'
import { buildWorkoutAnalysisPrompt } from '../../../trigger/analyze-workout'
import {
  buildWorkoutAnalysisFacts,
  buildWorkoutAnalysisFactsV2
} from '../../../server/utils/workout-analysis-facts'

describe('buildWorkoutAnalysisPrompt', () => {
  it('includes global ai context and converts stored kg weight to displayed pounds', () => {
    const prompt = buildWorkoutAnalysisPrompt(
      {
        date: new Date('2026-03-01T10:00:00Z'),
        title: 'Endurance Ride',
        type: 'Ride',
        duration_m: 90,
        duration_s: 5400,
        notes: 'Felt strong but kept it controlled.'
      },
      'UTC',
      'Supportive',
      undefined,
      {
        age: 36,
        sex: 'male',
        weight: 85.9,
        weightUnits: 'Pounds',
        height: 180,
        heightUnits: 'cm',
        language: 'English',
        temperatureUnits: 'Celsius'
      },
      'Prioritize aerobic durability and avoid overpraising short anaerobic efforts.'
    )

    expect(prompt).toContain('- Weight: 189.4 lbs')
    expect(prompt).toContain('## Global Athlete Context / About Me / Special Instructions')
    expect(prompt).toContain(
      'Prioritize aerobic durability and avoid overpraising short anaerobic efforts.'
    )
    expect(prompt).toContain('## Athlete Notes')
    expect(prompt).toContain('Felt strong but kept it controlled.')
  })

  it('injects only prompt-approved calculated workout facts', () => {
    const analysisFacts = buildWorkoutAnalysisFacts({
      workout: {
        id: 'w-1',
        title: 'Tempo Ride',
        type: 'Ride',
        durationSec: 5400,
        averageWatts: 220,
        averageHr: 145,
        trainingLoad: 100,
        trainer: false,
        streams: {
          heartrate: Array.from({ length: 100 }, () => 145),
          watts: Array.from({ length: 100 }, () => 220)
        }
      }
    })
    const analysisFactsV2 = buildWorkoutAnalysisFactsV2({
      workout: {
        id: 'w-1',
        title: 'Tempo Ride',
        type: 'Ride',
        durationSec: 5400,
        averageWatts: 220,
        averageHr: 145,
        trainingLoad: 100,
        trainer: false,
        variabilityIndex: 1.03,
        streams: {
          heartrate: Array.from({ length: 100 }, () => 145),
          watts: Array.from({ length: 100 }, () => 220)
        }
      }
    })

    const prompt = buildWorkoutAnalysisPrompt(
      {
        date: new Date('2026-03-01T10:00:00Z'),
        title: 'Tempo Ride',
        type: 'Ride',
        duration_m: 90,
        duration_s: 5400
      },
      'UTC',
      'Supportive',
      undefined,
      {
        age: 36,
        sex: 'male',
        weight: 85.9,
        weightUnits: 'Pounds',
        height: 180,
        heightUnits: 'cm',
        language: 'English',
        temperatureUnits: 'Celsius'
      },
      null,
      undefined,
      analysisFacts,
      analysisFactsV2
    )

    expect(prompt).toContain('## Calculated Workout Facts v2')
    expect(prompt).toContain('### Guardrails')
    expect(prompt).toContain('- Primary Archetype: endurance')
    expect(prompt).toContain('- HR Usable: Yes')
    expect(prompt).toContain('- Power Source Type: measured')
    expect(prompt).not.toContain('Computed From')
  })
})
