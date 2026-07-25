import { describe, expect, it } from 'vitest'
import {
  extractFluidIntakeMl,
  getHydrationAdviceLevel,
  getHydrationAdviceSummary,
  getIntraWorkoutFluidTargetByNowMl,
  HYDRATION_DEBT_NUDGE_THRESHOLD_ML,
  INTRA_WORKOUT_TARGET_ML_PER_HOUR
} from '../../../../../server/utils/nutrition/hydration'

describe('hydration advice', () => {
  it('maps higher debt to more urgent advice tiers', () => {
    expect(getHydrationAdviceLevel(2500)).toBe('severe')
    expect(getHydrationAdviceLevel(1600)).toBe('high')
    expect(getHydrationAdviceLevel(800)).toBe('moderate')
    expect(getHydrationAdviceLevel(200)).toBe('optimal')
  })

  it('gives stronger summary text to higher debt than mid-range debt', () => {
    const severeSummary = getHydrationAdviceSummary(2500)
    const highSummary = getHydrationAdviceSummary(1600)

    expect(severeSummary).toContain('WARNING')
    expect(highSummary).toContain('Add 500ml')
    expect(severeSummary).not.toEqual(highSummary)
  })

  it('uses the nudge threshold as the severe cutoff', () => {
    expect(getHydrationAdviceLevel(HYDRATION_DEBT_NUDGE_THRESHOLD_ML + 1)).toBe('severe')
    expect(getHydrationAdviceLevel(HYDRATION_DEBT_NUDGE_THRESHOLD_ML)).toBe('high')
  })
})

describe('getIntraWorkoutFluidTargetByNowMl', () => {
  const window = {
    startTime: '2026-07-22T09:00:00.000Z',
    endTime: '2026-07-22T11:00:00.000Z',
    targetFluid: 2400
  }

  it('prorates the window own fluid target rather than a flat per-hour rate', () => {
    // 2400ml over two hours is 1200/hr, well above the generic constant.
    expect(getIntraWorkoutFluidTargetByNowMl(window, 1)).toBe(1200)
    expect(getIntraWorkoutFluidTargetByNowMl(window, 1)).not.toBe(INTRA_WORKOUT_TARGET_ML_PER_HOUR)
  })

  it('never asks for more than the window holds', () => {
    expect(getIntraWorkoutFluidTargetByNowMl(window, 5)).toBe(2400)
  })

  it('treats a session that has not started as nothing due yet', () => {
    expect(getIntraWorkoutFluidTargetByNowMl(window, 0)).toBe(0)
    expect(getIntraWorkoutFluidTargetByNowMl(window, -2)).toBe(0)
  })

  it('falls back to the flat rate when the window carries no fluid target', () => {
    expect(getIntraWorkoutFluidTargetByNowMl({ ...window, targetFluid: 0 }, 2)).toBe(
      2 * INTRA_WORKOUT_TARGET_ML_PER_HOUR
    )
    expect(getIntraWorkoutFluidTargetByNowMl({ targetFluid: 1000 }, 2)).toBe(
      2 * INTRA_WORKOUT_TARGET_ML_PER_HOUR
    )
  })
})

describe('extractFluidIntakeMl', () => {
  it('reads explicit volumes and does not also add a container estimate', () => {
    expect(extractFluidIntakeMl('drank a 500ml bottle of water')).toBe(500)
    expect(extractFluidIntakeMl('1.5l of water')).toBe(1500)
  })

  it('counts multiple containers', () => {
    // A round of drinks in one phrase used to register as a single container.
    expect(extractFluidIntakeMl('2 bottles of water')).toBe(1000)
    expect(extractFluidIntakeMl('three glasses of water')).toBe(750)
    expect(extractFluidIntakeMl('had a glass of water')).toBe(250)
  })

  it('ignores text with no fluid in it', () => {
    expect(extractFluidIntakeMl('200g chicken and rice')).toBe(0)
    expect(extractFluidIntakeMl('')).toBe(0)
  })

  it('does not read an implausible count as a drink tally', () => {
    expect(extractFluidIntakeMl('2026 bottles of water')).toBe(500 * 12)
  })
})
