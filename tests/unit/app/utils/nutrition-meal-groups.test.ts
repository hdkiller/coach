import { describe, expect, it } from 'vitest'
import { groupWindowItemsByMeal } from '../../../../app/utils/nutrition-meal-groups'

const food = (name: string, meal?: string) => ({ name, meal })

describe('groupWindowItemsByMeal', () => {
  it('groups items under their DB bucket in bucket order', () => {
    const groups = groupWindowItemsByMeal([
      food('Steak', 'dinner'),
      food('Porridge', 'breakfast'),
      food('Soup', 'lunch')
    ])

    expect(groups.map((g) => g.meal)).toEqual(['breakfast', 'lunch', 'dinner'])
    expect(groups[0]?.label).toBe('Breakfast')
  })

  it('files an item with no meal under snacks', () => {
    const groups = groupWindowItemsByMeal([food('Gel')])

    expect(groups.map((g) => g.meal)).toEqual(['snacks'])
  })

  it('keeps a scheduled slot with a custom name', () => {
    // The four-bucket filter this replaced dropped 'Elevenses' entirely.
    const groups = groupWindowItemsByMeal([], ['Elevenses'])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.meal).toBe('elevenses')
    expect(groups[0]?.label).toBe('Elevenses')
    expect(groups[0]?.isScheduled).toBe(true)
  })

  it('keeps a scheduled slot named in another language', () => {
    const groups = groupWindowItemsByMeal([], ['Reggeli', 'Uzsonna'])

    expect(groups.map((g) => g.label)).toEqual(['Reggeli', 'Uzsonna'])
  })

  it('renders an empty scheduled slot so the athlete can see it is planned', () => {
    const groups = groupWindowItemsByMeal([], ['Vacsora'])

    expect(groups[0]?.items).toEqual([])
    expect(groups[0]?.isScheduled).toBe(true)
  })

  it('matches a scheduled slot to its bucket regardless of case', () => {
    const groups = groupWindowItemsByMeal([food('Porridge', 'breakfast')], ['Breakfast'])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.meal).toBe('breakfast')
    expect(groups[0]?.isScheduled).toBe(true)
    expect(groups[0]?.items).toHaveLength(1)
  })

  it('orders custom slots after the fixed buckets, in meal-pattern order', () => {
    const groups = groupWindowItemsByMeal([food('Steak', 'dinner')], ['Second lunch', 'Elevenses'])

    expect(groups.map((g) => g.meal)).toEqual(['dinner', 'second lunch', 'elevenses'])
  })

  it('does not emit a bucket twice when a slot repeats', () => {
    const groups = groupWindowItemsByMeal([], ['Elevenses', 'elevenses'])

    expect(groups).toHaveLength(1)
  })

  it('folds the shipped "Snack" slot into the snacks bucket its items live in', () => {
    // The default meal pattern says 'Snack'; the DB bucket is 'snacks'. Treating them as separate
    // slots showed a populated "Snacks" heading next to an empty "Snack" one.
    const groups = groupWindowItemsByMeal([food('Banana', 'snacks')], ['Snack'])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.meal).toBe('snacks')
    expect(groups[0]?.items).toHaveLength(1)
    expect(groups[0]?.isScheduled).toBe(true)
  })

  it('folds the whole shipped default pattern onto the four buckets', () => {
    const groups = groupWindowItemsByMeal([], ['Breakfast', 'Lunch', 'Dinner', 'Snack'])

    expect(groups.map((g) => g.meal)).toEqual(['breakfast', 'lunch', 'dinner', 'snacks'])
  })

  it('ignores blank slot names', () => {
    expect(groupWindowItemsByMeal([], ['   ', ''])).toEqual([])
  })
})
