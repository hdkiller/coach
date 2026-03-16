import { describe, expect, it } from 'vitest'
import { buildWorkoutAnalysisPrompt } from '../../../trigger/analyze-workout'
import { buildWorkoutAnalysisFactsV2 } from '../../../server/utils/workout-analysis-facts'

describe('buildWorkoutAnalysisPrompt', () => {
  it('adds stop-and-go and ski-specific guardrails to the workout analysis prompt', () => {
    const speed = [
      ...Array.from({ length: 150 }, () => 0),
      ...Array.from({ length: 220 }, () => 3.2),
      ...Array.from({ length: 60 }, () => 0),
      ...Array.from({ length: 180 }, () => 5.8),
      ...Array.from({ length: 80 }, () => 0.4),
      ...Array.from({ length: 200 }, () => 4.9),
      ...Array.from({ length: 90 }, () => 0)
    ]

    const workoutData = {
      date: new Date('2026-03-15T10:00:00Z'),
      title: 'Ski de fond classique MSA',
      type: 'NordicSki',
      duration_m: Math.round((speed.length * 5) / 60),
      duration_s: speed.length * 5,
      avg_hr: 152,
      max_hr: 181,
      avg_speed_ms: 3.4,
      avg_power: null,
      normalized_power: null,
      variability_index: null,
      decoupling: -91.8,
      atl: 34.4
    }

    const analysisFactsV2 = buildWorkoutAnalysisFactsV2({
      workout: {
        ...workoutData,
        durationSec: workoutData.duration_s,
        averageHr: workoutData.avg_hr,
        maxHr: workoutData.max_hr,
        averageSpeed: workoutData.avg_speed_ms,
        averageWatts: null,
        normalizedPower: null,
        intensity: 0.84,
        streams: {
          velocity: speed,
          heartrate: Array.from({ length: speed.length }, (_, index) =>
            index % 180 < 90 ? 168 : 132
          )
        }
      }
    })

    const prompt = buildWorkoutAnalysisPrompt(
      workoutData,
      'Europe/Budapest',
      'Supportive',
      undefined,
      {
        age: 35,
        sex: 'male',
        weight: null,
        language: 'English',
        temperatureUnits: 'Celsius'
      },
      null,
      undefined,
      undefined,
      analysisFactsV2
    )

    expect(prompt).toContain('Session Steadiness: stochastic')
    expect(prompt).toContain(
      'Do not criticize the athlete for lacking a constant pace or uniform effort'
    )
    expect(prompt).toContain(
      'avoid cycling-specific gear advice such as recommending a power meter'
    )
    expect(prompt).toContain('Decoupling Guardrail:')
    expect(prompt).not.toContain('- Decoupling: -91.8%')
  })
})
