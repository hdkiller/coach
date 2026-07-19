import { describe, expect, it } from 'vitest'
import { parseLiftosaurWorkout } from '../../../../server/utils/liftosaur-workout-parser'

describe('parseLiftosaurWorkout', () => {
  it('parses workout metadata, exercises, warmups, and completed sets', () => {
    const parsed =
      parseLiftosaurWorkout(`2026-03-01T10:00:00Z / program: "5/3/1" / dayName: "Squat Day" / week: 1 / dayInWeek: 1 / duration: 3600s / exercises: {
  Squat, Barbell / 3x5 185lb, 1x3 185lb @8 / warmup: 1x5 95lb, 1x3 135lb / target: 3x5 185lb 120s
  Leg Press / 3x10 200lb / target: 3x10 200lb 90s
}`)

    expect(parsed.date.toISOString()).toBe('2026-03-01T10:00:00.000Z')
    expect(parsed.program).toBe('5/3/1')
    expect(parsed.dayName).toBe('Squat Day')
    expect(parsed.durationSec).toBe(3600)
    expect(parsed.exercises).toHaveLength(2)
    expect(parsed.exercises[0]).toMatchObject({
      name: 'Squat',
      equipment: 'Barbell',
      target: '3x5 185lb 120s'
    })
    expect(parsed.exercises[0]!.sets).toHaveLength(6)
    expect(parsed.exercises[0]!.sets.filter((set) => set.type === 'WARMUP')).toHaveLength(2)
    expect(parsed.exercises[0]!.sets[3]).toMatchObject({
      reps: 3,
      weight: 185,
      weightUnit: 'lb',
      rpe: 8
    })
  })

  it('keeps unsupported clauses as warnings without rejecting the workout', () => {
    const parsed = parseLiftosaurWorkout(
      '2026-03-01T10:00:00Z / duration: 45m / exercises: {\nSquat / not-a-set\n}'
    )

    expect(parsed.durationSec).toBe(2700)
    expect(parsed.exercises[0]!.sets).toEqual([])
    expect(parsed.warnings).toContain('Unsupported set notation: not-a-set')
  })

  it('rejects records without a valid timestamp', () => {
    expect(() => parseLiftosaurWorkout('not-a-date / exercises: {\nSquat / 3x5 100kg\n}')).toThrow(
      'invalid or missing timestamp'
    )
  })
})
