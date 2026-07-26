import { describe, expect, it } from 'vitest'
import {
  pickMealScheduledTime,
  pickSlotScheduledTime
} from '../../../../../server/utils/nutrition/meal-pattern'

const ENGLISH = [
  { name: 'Breakfast', time: '06:30' },
  { name: 'Lunch', time: '11:30' },
  { name: 'Dinner', time: '19:30' },
  { name: 'Snack', time: '16:00' }
]

// The settings UI lets an athlete name a slot anything, in any language.
const HUNGARIAN = [
  { name: 'Reggeli', time: '06:30' },
  { name: 'Ebéd', time: '11:30' },
  { name: 'Vacsora', time: '19:30' },
  { name: 'Uzsonna', time: '16:00' }
]

describe('pickMealScheduledTime', () => {
  it('uses the athlete-configured time for English slot names', () => {
    expect(pickMealScheduledTime('breakfast', ENGLISH)).toBe('06:30')
    expect(pickMealScheduledTime('dinner', ENGLISH)).toBe('19:30')
    expect(pickMealScheduledTime('snacks', ENGLISH)).toBe('16:00')
  })

  it('falls back to slot position for a pattern in another language', () => {
    // The literal-name lookup this replaced returned a fixed 07:00 / 12:00 / 18:00 here.
    expect(pickMealScheduledTime('breakfast', HUNGARIAN)).toBe('06:30')
    expect(pickMealScheduledTime('lunch', HUNGARIAN)).toBe('11:30')
    expect(pickMealScheduledTime('dinner', HUNGARIAN)).toBe('19:30')
    expect(pickMealScheduledTime('snacks', HUNGARIAN)).toBe('16:00')
  })

  it('falls back to the built-in default when there is no pattern', () => {
    expect(pickMealScheduledTime('breakfast', [])).toBe('07:00')
    expect(pickMealScheduledTime('lunch', null)).toBe('12:00')
  })
})

describe('pickSlotScheduledTime', () => {
  it('finds a custom slot by its own name', () => {
    expect(
      pickSlotScheduledTime('Elevenses', [...ENGLISH, { name: 'Elevenses', time: '10:30' }])
    ).toBe('10:30')
  })

  it('matches case-insensitively and ignores surrounding space', () => {
    expect(pickSlotScheduledTime('  breakfast ', ENGLISH)).toBe('06:30')
  })

  it('returns null when the pattern has no such slot, so the caller can fall back', () => {
    expect(pickSlotScheduledTime('Elevenses', ENGLISH)).toBeNull()
    expect(pickSlotScheduledTime('', ENGLISH)).toBeNull()
    expect(pickSlotScheduledTime('Lunch', null)).toBeNull()
  })

  it('does not partially match another slot', () => {
    // 'Snack' must not answer for 'Post-ride snack'.
    expect(pickSlotScheduledTime('Post-ride snack', ENGLISH)).toBeNull()
  })
})
