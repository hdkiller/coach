import { describe, expect, it } from 'vitest'

import { isHevyWorkoutInDateWindow } from '../../../../server/utils/hevy'

describe('isHevyWorkoutInDateWindow', () => {
  const workout = {
    id: 'workout-1',
    title: 'Leg Day',
    description: '',
    start_time: '2026-03-05T10:00:00.000Z',
    end_time: '2026-03-05T11:00:00.000Z',
    exercises: []
  }

  it('treats workouts without a date window as in range', () => {
    expect(isHevyWorkoutInDateWindow(workout)).toEqual({
      inWindow: true,
      beforeWindow: false
    })
  })

  it('flags workouts older than the start date', () => {
    expect(
      isHevyWorkoutInDateWindow(workout, '2026-03-06T00:00:00.000Z', '2026-03-12T00:00:00.000Z')
    ).toEqual({
      inWindow: false,
      beforeWindow: true
    })
  })

  it('skips workouts newer than the end date without stopping pagination', () => {
    expect(
      isHevyWorkoutInDateWindow(workout, '2026-03-01T00:00:00.000Z', '2026-03-04T00:00:00.000Z')
    ).toEqual({
      inWindow: false,
      beforeWindow: false
    })
  })

  it('accepts workouts inside the requested window', () => {
    expect(
      isHevyWorkoutInDateWindow(workout, '2026-03-01T00:00:00.000Z', '2026-03-10T00:00:00.000Z')
    ).toEqual({
      inWindow: true,
      beforeWindow: false
    })
  })
})
