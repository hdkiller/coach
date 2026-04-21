import { describe, expect, it } from 'vitest'
import { computePowerCurveWindows } from './power-curve'

describe('computePowerCurveWindows', () => {
  it('finds the best window for regular 1 Hz samples', () => {
    const watts = [100, 100, 200, 200, 200, 100, 100]
    const time = watts.map((_, index) => index)

    const [window] = computePowerCurveWindows(watts, time, [2])

    expect(window).toMatchObject({
      duration: 2,
      power: 200,
      startIndex: 2,
      endIndex: 4,
      startTime: 2,
      endTime: 4
    })
  })

  it('uses timestamps instead of assuming regular samples', () => {
    const watts = [100, 400, 400, 100]
    const time = [0, 3, 7, 10]

    const [window] = computePowerCurveWindows(watts, time, [4])

    expect(window).toMatchObject({
      power: 400,
      startIndex: 1,
      endIndex: 2,
      startTime: 3,
      endTime: 7
    })
  })

  it('skips durations that are longer than the workout', () => {
    const result = computePowerCurveWindows([100, 200, 300], [0, 1, 2], [5])

    expect(result).toEqual([])
  })

  it('normalizes invalid and negative watts without shifting indices', () => {
    const watts = [100, 'bad', -20, 300, 300, 300]
    const time = [0, 1, 2, 3, 4, 5]

    const [window] = computePowerCurveWindows(watts, time, [2])

    expect(window).toMatchObject({
      power: 300,
      startIndex: 3,
      endIndex: 5
    })
  })
})
