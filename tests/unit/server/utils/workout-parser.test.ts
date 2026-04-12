import { describe, expect, it } from 'vitest'
import { WorkoutParser } from '../../../../server/utils/workout-parser'

describe('WorkoutParser', () => {
  it('preserves warmup type for low-intensity warmup steps', () => {
    const steps = WorkoutParser.parseIntervalsICU('Warmup\n- Easy spin 5m 50%', {
      workoutType: 'Ride'
    })

    expect(steps[0]?.type).toBe('Warmup')
    expect(steps[0]?.name).toBe('Easy spin')
    expect(steps[0]?.power).toMatchObject({
      value: 0.5,
      units: '%'
    })
  })

  it('preserves cooldown type for low-intensity cooldown steps', () => {
    const steps = WorkoutParser.parseIntervalsICU('Cooldown\n- Easy roll 5m 45%', {
      workoutType: 'Ride'
    })

    expect(steps[0]?.type).toBe('Cooldown')
    expect(steps[0]?.name).toBe('Easy roll')
    expect(steps[0]?.power).toMatchObject({
      value: 0.45,
      units: '%'
    })
  })

  it('preserves explicit ramp markers on parsed range steps', () => {
    const steps = WorkoutParser.parseIntervalsICU('Warmup\n- 10m ramp 50-70%', {
      workoutType: 'Ride'
    })

    expect(steps[0]?.type).toBe('Warmup')
    expect(steps[0]?.power).toMatchObject({
      range: { start: 0.5, end: 0.7 },
      ramp: true,
      units: '%'
    })
  })

  it('parses Intervals meter distance tokens using mtr', () => {
    const steps = WorkoutParser.parseIntervalsICU('Main Set\n- 400mtr Easy Z1 Pace', {
      workoutType: 'Swim'
    })

    expect(steps[0]?.distance).toBe(400)
    expect(steps[0]?.name).toBe('Easy Z1')
  })
})
