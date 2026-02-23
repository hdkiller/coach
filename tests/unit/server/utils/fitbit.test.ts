import { describe, expect, it } from 'vitest'
import {
  mergeFitbitNutritionWithExisting,
  normalizeFitbitNutrition
} from '../../../../server/utils/fitbit'

describe('fitbit nutrition normalization and merge', () => {
  it('assigns logged_at using meal schedule settings', () => {
    const normalized = normalizeFitbitNutrition(
      {
        foods: [
          {
            logDate: '2026-02-20',
            logId: 123,
            loggedFood: {
              mealTypeId: 1,
              name: 'Oatmeal',
              amount: 1,
              calories: 250,
              unit: { name: 'serving', plural: 'servings' }
            },
            nutritionalValues: {
              calories: 250,
              carbs: 42,
              protein: 8,
              fat: 5
            }
          }
        ],
        summary: {
          calories: 250,
          carbs: 42,
          protein: 8,
          fat: 5
        }
      },
      { summary: { water: 500 } },
      { goals: { calories: 2200 } },
      'user-1',
      '2026-02-20',
      {
        timezone: 'Australia/Sydney',
        mealPattern: [
          { name: 'Breakfast', time: '09:15' },
          { name: 'Lunch', time: '13:00' },
          { name: 'Dinner', time: '19:00' },
          { name: 'Snack', time: '16:00' }
        ]
      }
    )

    const breakfastItems = normalized.breakfast as any[]
    expect(Array.isArray(breakfastItems)).toBe(true)
    expect(breakfastItems[0]?.id).toBe('fitbit:123')
    expect(breakfastItems[0]?.fitbitLogId).toBe(123)
    expect(breakfastItems[0]?.fitbitTimeDerived).toBe(true)
    expect(typeof breakfastItems[0]?.logged_at).toBe('string')
    expect(breakfastItems[0]?.logged_at).toContain('T')
  })

  it('preserves manually edited fitbit logged_at across sync and keeps manual items', () => {
    const incoming = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          logged_at: '2026-02-19T22:15:00.000Z',
          fitbitTimeDerived: true
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const existing = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          logged_at: '2026-02-20T00:45:00.000Z',
          fitbitTimeDerived: false
        },
        {
          id: 'manual-1',
          name: 'Coffee',
          source: 'manual',
          logged_at: '2026-02-20T00:55:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const merged = mergeFitbitNutritionWithExisting(incoming, existing)
    const breakfastItems = (merged.breakfast || []) as any[]

    const fitbitItem = breakfastItems.find((item) => item.fitbitLogId === 123)
    const manualItem = breakfastItems.find((item) => item.id === 'manual-1')

    expect(fitbitItem?.logged_at).toBe('2026-02-20T00:45:00.000Z')
    expect(fitbitItem?.fitbitTimeDerived).toBe(false)
    expect(manualItem?.name).toBe('Coffee')
  })

  it('preserves app-only fields like absorptionType for matched fitbit items', () => {
    const incoming = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          logged_at: '2026-02-19T22:15:00.000Z',
          fitbitTimeDerived: true,
          calories: 250
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const existing = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          logged_at: '2026-02-20T00:45:00.000Z',
          fitbitTimeDerived: true,
          absorptionType: 'DENSE'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const merged = mergeFitbitNutritionWithExisting(incoming, existing)
    const breakfastItems = (merged.breakfast || []) as any[]
    const fitbitItem = breakfastItems.find((item) => item.fitbitLogId === 123)

    expect(fitbitItem?.absorptionType).toBe('DENSE')
    expect(fitbitItem?.calories).toBe(250)
  })

  it('preserves manual meal bucket override when fitbitMealDerived is false', () => {
    const incoming = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          logged_at: '2026-02-19T22:15:00.000Z',
          fitbitTimeDerived: true,
          fitbitMealDerived: true
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const existing = {
      userId: 'user-1',
      date: new Date('2026-02-20T00:00:00.000Z'),
      breakfast: [],
      lunch: [
        {
          id: 'fitbit:123',
          fitbitLogId: 123,
          logId: 123,
          name: 'Oatmeal',
          source: 'fitbit',
          fitbitMealDerived: false
        }
      ],
      dinner: null,
      snacks: null
    }

    const merged = mergeFitbitNutritionWithExisting(incoming, existing)

    expect((merged.breakfast || []).some((item: any) => item.fitbitLogId === 123)).toBe(false)
    expect((merged.lunch || []).some((item: any) => item.fitbitLogId === 123)).toBe(true)
    expect(
      (merged.lunch || []).find((item: any) => item.fitbitLogId === 123)?.fitbitMealDerived
    ).toBe(false)
  })
})
