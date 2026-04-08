import { describe, expect, it } from 'vitest'

import {
  attachRecommendationGuardrails,
  buildCalendarSourceOfTruthPrompt,
  validateRecommendationAcceptanceTarget
} from '../../../../server/utils/recommendation-guardrails'

describe('recommendation guardrails', () => {
  it('keeps the calendar prompt structural and language-agnostic', () => {
    const prompt = buildCalendarSourceOfTruthPrompt([
      {
        id: 'w1',
        title: 'Endurance Ride',
        type: 'Ride',
        description: 'Consistent Zone 2 ride. Focus on recovery and maintaining rhythm.'
      }
    ])

    expect(prompt).toContain(
      'Goals, athlete profile commentary, old recommendations, and event categories are NOT scheduled workouts.'
    )
    expect(prompt).toContain(
      'There is 1 planned workout listed in this prompt. Rely only on those entries when referring to what is actually booked.'
    )
  })

  it('attaches a target workout snapshot without semantic workout classification', () => {
    const analysis = attachRecommendationGuardrails(
      { recommendation: 'modify' },
      {
        id: 'w1',
        date: new Date('2026-04-08T00:00:00.000Z'),
        title: 'VO2 Max Intervals',
        type: 'Ride',
        durationSec: 5400,
        tss: 95,
        updatedAt: new Date('2026-04-06T08:00:00.000Z')
      },
      [
        {
          id: 'w1',
          date: new Date('2026-04-08T00:00:00.000Z'),
          title: 'VO2 Max Intervals',
          type: 'Ride',
          durationSec: 5400,
          tss: 95,
          updatedAt: new Date('2026-04-06T08:00:00.000Z')
        }
      ]
    ) as any

    expect(analysis.guardrails).toEqual({
      calendarSourceOfTruth: true,
      consentRequiredForWorkoutMutation: true,
      plannedWorkoutCandidateCount: 1,
      targetPlannedWorkout: {
        id: 'w1',
        date: '2026-04-08T00:00:00.000Z',
        title: 'VO2 Max Intervals',
        type: 'Ride',
        durationSec: 5400,
        tss: 95,
        updatedAt: '2026-04-06T08:00:00.000Z'
      }
    })
  })

  it('rejects acceptance when a workout changed after recommendation generation', () => {
    const result = validateRecommendationAcceptanceTarget({
      recommendationDate: new Date('2026-04-06T00:00:00.000Z'),
      activeWorkoutCountForDate: 1,
      targetSnapshot: {
        id: 'w1',
        date: '2026-04-06T00:00:00.000Z',
        title: 'Oster GRVL Tag 4: Heimreise (800hm)',
        type: 'Ride',
        durationSec: 9000,
        tss: 148,
        updatedAt: '2026-04-06T04:55:00.000Z'
      },
      currentWorkout: {
        id: 'w1',
        title: 'Oster GRVL Tag 4: Heimreise (800hm)',
        type: 'Ride',
        updatedAt: new Date('2026-04-06T05:01:10.600Z'),
        completed: false,
        completionStatus: 'PENDING',
        completedWorkouts: []
      }
    })

    expect(result).toEqual({
      ok: false,
      message:
        'That workout changed after this recommendation was generated. Refresh today’s guidance before applying changes.'
    })
  })
})
