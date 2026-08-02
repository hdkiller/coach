import { describe, expect, it } from 'vitest'
import { dailyBaseWindowKey, resolveWindowKey, slugifySlot } from './window-keys'

describe('window-keys', () => {
  describe('slugifySlot', () => {
    it('strips leading and trailing punctuation the same way for every caller', () => {
      // The drifted copies produced 'lunch-' here, which unlinked stored meals.
      expect(slugifySlot('Lunch!')).toBe('lunch')
      expect(slugifySlot('  Snack  ')).toBe('snack')
      expect(slugifySlot('Post ride ')).toBe('post-ride')
    })

    it('falls back to a usable slug for names with no usable characters', () => {
      expect(slugifySlot('!!!')).toBe('slot')
      expect(slugifySlot('☕️')).toBe('slot')
      expect(slugifySlot('')).toBe('slot')
    })
  })

  describe('dailyBaseWindowKey', () => {
    it('derives slot-specific keys', () => {
      expect(dailyBaseWindowKey('Breakfast')).toBe('DAILY_BASE:breakfast')
    })

    it('keeps the legacy bare key when no slot name exists', () => {
      expect(dailyBaseWindowKey('')).toBe('DAILY_BASE')
      expect(dailyBaseWindowKey(undefined)).toBe('DAILY_BASE')
    })
  })

  describe('resolveWindowKey', () => {
    it('prefers an explicit window key', () => {
      expect(resolveWindowKey({ type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#2' })).toBe(
        'PRE_WORKOUT#2'
      )
    })

    it('derives DAILY_BASE keys from slot name or label', () => {
      expect(resolveWindowKey({ type: 'DAILY_BASE', slotName: 'Snack' })).toBe('DAILY_BASE:snack')
      expect(resolveWindowKey({ type: 'DAILY_BASE', label: 'Lunch!' })).toBe('DAILY_BASE:lunch')
    })

    it('treats keyless typed windows as the first of their type', () => {
      expect(resolveWindowKey({ type: 'PRE_WORKOUT' })).toBe('PRE_WORKOUT#1')
    })

    it('is defensive about empty input', () => {
      expect(resolveWindowKey(null)).toBe('')
      expect(resolveWindowKey({})).toBe('')
    })
  })
})
