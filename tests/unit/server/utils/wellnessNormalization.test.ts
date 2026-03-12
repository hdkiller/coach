import { describe, expect, it } from 'vitest'

import {
  normalizeSpO2Percentage,
  normalizeWellnessFields
} from '../../../../server/utils/wellnessNormalization'

describe('wellness normalization', () => {
  it('converts Apple Health fractional spO2 values into percentages', () => {
    expect(normalizeSpO2Percentage(1)).toBe(100)
    expect(normalizeSpO2Percentage(0.976)).toBe(97.6)
  })

  it('leaves already-scaled spO2 percentages unchanged', () => {
    expect(normalizeSpO2Percentage(98)).toBe(98)
    expect(normalizeSpO2Percentage(96.5)).toBe(96.5)
  })

  it('normalizes wellness payload aliases and spO2 together', () => {
    expect(
      normalizeWellnessFields({
        vo2Max: 58.2,
        spO2: 0.99
      })
    ).toEqual({
      vo2max: 58.2,
      spO2: 99
    })
  })
})
