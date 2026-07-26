import { describe, expect, it } from 'vitest'
import { fuelingSuggestionText } from '../../../../app/utils/nutrition-suggestions'

const NO_RESTRICTIONS = {
  dietaryProfile: [],
  foodAllergies: [],
  foodIntolerances: [],
  lifestyleExclusions: []
}

describe('fuelingSuggestionText', () => {
  it('names foods for an athlete with no restrictions', () => {
    expect(fuelingSuggestionText(100, NO_RESTRICTIONS)).toContain('bagel')
    expect(fuelingSuggestionText(50, NO_RESTRICTIONS)).toContain('oatmeal')
    expect(fuelingSuggestionText(10, NO_RESTRICTIONS)).toContain('energy gel')
  })

  it('keeps the original carb thresholds', () => {
    expect(fuelingSuggestionText(81, NO_RESTRICTIONS)).toContain('bagel')
    expect(fuelingSuggestionText(80, NO_RESTRICTIONS)).toContain('oatmeal')
    expect(fuelingSuggestionText(41, NO_RESTRICTIONS)).toContain('oatmeal')
    expect(fuelingSuggestionText(40, NO_RESTRICTIONS)).toContain('energy gel')
  })

  it('does not name a bagel to a coeliac', () => {
    const text = fuelingSuggestionText(100, {
      ...NO_RESTRICTIONS,
      dietaryProfile: ['GLUTEN_FREE']
    })

    expect(text).not.toContain('bagel')
    expect(text).toContain('high-glycemic carbs')
  })

  it('does not name a bagel to someone allergic to wheat', () => {
    expect(
      fuelingSuggestionText(100, { ...NO_RESTRICTIONS, foodAllergies: ['WHEAT'] })
    ).not.toContain('bagel')
  })

  it('does not name honey to a vegan', () => {
    const text = fuelingSuggestionText(50, { ...NO_RESTRICTIONS, dietaryProfile: ['VEGAN'] })

    expect(text).not.toContain('honey')
    expect(text).toContain('Moderate fueling')
  })

  it('honours an intolerance', () => {
    expect(
      fuelingSuggestionText(10, { ...NO_RESTRICTIONS, foodIntolerances: ['FRUCTOSE'] })
    ).not.toContain('fruit')
  })

  it('honours a lifestyle exclusion', () => {
    expect(
      fuelingSuggestionText(10, { ...NO_RESTRICTIONS, lifestyleExclusions: ['NO_PROCESSED_FOODS'] })
    ).not.toContain('energy gel')
  })

  it('stays generic when the constraints are not known', () => {
    // Absent settings are not evidence that a food is safe.
    expect(fuelingSuggestionText(100, null)).not.toContain('bagel')
    expect(fuelingSuggestionText(100, undefined as any)).not.toContain('bagel')
  })

  it('matches constraints case-insensitively and ignores surrounding space', () => {
    expect(
      fuelingSuggestionText(100, { ...NO_RESTRICTIONS, dietaryProfile: [' gluten_free '] })
    ).not.toContain('bagel')
  })

  it('leaves an unrelated constraint alone', () => {
    expect(
      fuelingSuggestionText(100, { ...NO_RESTRICTIONS, foodAllergies: ['SHELLFISH'] })
    ).toContain('bagel')
  })
})
