import { describe, expect, it } from 'vitest'
import {
  buildWorkoutReceivedActivityFingerprint,
  buildInterestingCopy,
  evaluateWorkoutReceivedEligibility,
  normalizeSubjectSpacing
} from '../../../../server/utils/workout-insight-email'

describe('workout insight email subject formatting', () => {
  it('adds missing spacing after punctuation around interpolated values', () => {
    const subject = 'Great shift, Anderd93.66.7 km in the books.'
    expect(normalizeSubjectSpacing(subject)).toBe('Great shift, Anderd93. 66.7 km in the books.')
  })

  it('preserves numeric punctuation for distances and thousands', () => {
    const subject = 'Great shift, Alex. 66.7 km logged with 1,000 kJ.'
    expect(normalizeSubjectSpacing(subject)).toBe(
      'Great shift, Alex. 66.7 km logged with 1,000 kJ.'
    )
  })
})

describe('workout received copy variant rotation', () => {
  it('avoids recently used variant ids per slot when alternatives exist', () => {
    const recentVariantIds = {
      heroTitle: new Set(['hero_distance_1']),
      introLine: new Set(['intro_2']),
      ctaLabel: new Set(['cta_3']),
      nextStepMessage: new Set(['next_1']),
      subject: new Set(['subject_distance_2'])
    }

    const copy = buildInterestingCopy({
      workoutId: 'workout-1',
      sportCategory: 'run',
      workoutTitle: 'Morning Run',
      firstName: 'Alex',
      distanceLabel: '10.0 km',
      recentVariantIds
    })

    expect(copy.copyVariantIds.heroTitle).not.toBe('hero_distance_1')
    expect(copy.copyVariantIds.introLine).not.toBe('intro_2')
    expect(copy.copyVariantIds.ctaLabel).not.toBe('cta_3')
    expect(copy.copyVariantIds.nextStepMessage).not.toBe('next_1')
    expect(copy.copyVariantIds.subject).not.toBe('subject_distance_2')
  })

  it('falls back to full pool when all variants for a slot were recently used', () => {
    const recentVariantIds = {
      heroTitle: new Set(['hero_distance_1', 'hero_distance_2', 'hero_distance_3']),
      introLine: new Set<string>(),
      ctaLabel: new Set<string>(),
      nextStepMessage: new Set<string>(),
      subject: new Set<string>()
    }

    const copy = buildInterestingCopy({
      workoutId: 'workout-2',
      sportCategory: 'run',
      workoutTitle: 'Evening Run',
      firstName: 'Taylor',
      distanceLabel: '6.0 km',
      recentVariantIds
    })

    expect(['hero_distance_1', 'hero_distance_2', 'hero_distance_3']).toContain(
      copy.copyVariantIds.heroTitle
    )
  })
})

describe('workout received dedupe fingerprint', () => {
  it('produces the same fingerprint for equivalent activities across sources', () => {
    const first = buildWorkoutReceivedActivityFingerprint({
      userId: 'user-1',
      workoutType: 'Run',
      workoutDate: new Date('2026-02-27T10:02:30.000Z'),
      durationSec: 1825,
      distanceKm: 10.04
    })
    const second = buildWorkoutReceivedActivityFingerprint({
      userId: 'user-1',
      workoutType: 'run',
      workoutDate: new Date('2026-02-27T10:04:59.000Z'),
      durationSec: 1799,
      distanceKm: 10.0
    })

    expect(first).toBe(second)
  })
})

describe('workout received eligibility rules', () => {
  it('skips workouts shorter than 10 minutes', () => {
    const result = evaluateWorkoutReceivedEligibility({
      durationSec: 599,
      workoutDate: new Date('2026-02-27T09:55:00.000Z'),
      now: new Date('2026-02-27T10:00:00.000Z')
    })

    expect(result).toEqual({ eligible: false, reason: 'duration_below_10_minutes' })
  })

  it('skips workouts older than 24 hours', () => {
    const result = evaluateWorkoutReceivedEligibility({
      durationSec: 1200,
      workoutDate: new Date('2026-02-26T09:59:59.000Z'),
      now: new Date('2026-02-27T10:00:00.000Z')
    })

    expect(result).toEqual({ eligible: false, reason: 'workout_older_than_24_hours' })
  })

  it('allows workouts that pass duration and recency checks', () => {
    const result = evaluateWorkoutReceivedEligibility({
      durationSec: 600,
      workoutDate: new Date('2026-02-27T09:59:59.000Z'),
      now: new Date('2026-02-27T10:00:00.000Z')
    })

    expect(result).toEqual({ eligible: true })
  })
})
