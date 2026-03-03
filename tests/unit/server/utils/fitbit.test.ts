import { describe, expect, it } from 'vitest'
import {
  mergeFitbitNutritionWithExisting,
  normalizeFitbitNutrition,
  normalizeFitbitWellness
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

  it('preserves legacy manual logged_at when fitbitTimeDerived flag is missing', () => {
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
          logged_at: '2026-02-19T22:15:00.000Z'
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
          logged_at: '2026-02-20T00:45:00.000Z'
        }
      ],
      lunch: null,
      dinner: null,
      snacks: null
    }

    const merged = mergeFitbitNutritionWithExisting(incoming, existing)
    const breakfastItems = (merged.breakfast || []) as any[]
    const fitbitItem = breakfastItems.find((item) => item.fitbitLogId === 123)

    expect(fitbitItem?.logged_at).toBe('2026-02-20T00:45:00.000Z')
    expect(fitbitItem?.fitbitTimeDerived).toBe(false)
  })
})

describe('fitbit wellness normalization', () => {
  it('normalizes sleep, HRV, and resting heart rate into wellness fields', () => {
    const normalized = normalizeFitbitWellness(
      {
        sleep: [
          {
            isMainSleep: true,
            startTime: '2026-02-28T23:30:00.000',
            endTime: '2026-03-01T06:45:00.000',
            minutesAsleep: 420,
            efficiency: 88,
            levels: {
              summary: {
                deep: { minutes: 90 },
                light: { minutes: 230 },
                rem: { minutes: 100 },
                wake: { minutes: 25 }
              }
            }
          }
        ],
        summary: {
          totalMinutesAsleep: 420
        }
      },
      {
        hrv: [
          {
            dateTime: '2026-03-01',
            value: {
              dailyRmssd: 54.2
            }
          }
        ]
      },
      {
        'activities-heart': [
          {
            dateTime: '2026-03-01',
            value: {
              restingHeartRate: 47
            }
          }
        ]
      },
      {
        'activities-heart-intraday': {
          dataset: [
            { time: '23:30:00', value: 44 },
            { time: '00:15:00', value: 46 },
            { time: '01:10:00', value: 45 },
            { time: '05:55:00', value: 47 },
            { time: '12:00:00', value: 86 }
          ]
        }
      },
      {
        weight: [{ weight: 71.4 }]
      },
      {
        fat: [{ fat: 14.8 }]
      },
      {
        value: { avg: 96.7 }
      },
      {
        br: [
          {
            value: { breathingRate: 13.2 }
          }
        ]
      },
      'user-1',
      '2026-03-01'
    )

    expect(normalized).not.toBeNull()
    expect(normalized?.hrv).toBe(54.2)
    expect(normalized?.restingHr).toBe(47)
    expect(normalized?.avgSleepingHr).toBe(46)
    expect(normalized?.sleepSecs).toBe(25200)
    expect(normalized?.sleepHours).toBe(7)
    expect(normalized?.sleepScore).toBeNull()
    expect(normalized?.sleepQuality).toBe(88)
    expect(normalized?.sleepDeepSecs).toBe(5400)
    expect(normalized?.sleepLightSecs).toBe(13800)
    expect(normalized?.sleepRemSecs).toBe(6000)
    expect(normalized?.sleepAwakeSecs).toBe(1500)
    expect(normalized?.weight).toBe(71.4)
    expect(normalized?.bodyFat).toBe(14.8)
    expect(normalized?.spO2).toBe(96.7)
    expect(normalized?.respiration).toBe(13.2)
    expect(normalized?.source).toBe('fitbit')
  })

  it('maps sleep score when Fitbit payload includes it', () => {
    const normalized = normalizeFitbitWellness(
      {
        sleep: [
          {
            isMainSleep: true,
            minutesAsleep: 420,
            score: {
              overall: 82
            }
          }
        ]
      },
      { hrv: [] },
      { 'activities-heart': [] },
      { 'activities-heart-intraday': { dataset: [] } },
      { weight: [] },
      { fat: [] },
      { value: {} },
      { br: [] },
      'user-1',
      '2026-03-01'
    )

    expect(normalized?.sleepScore).toBe(82)
  })

  it('returns null when no wellness metrics are available', () => {
    const normalized = normalizeFitbitWellness(
      {
        sleep: [],
        summary: {}
      },
      {
        hrv: []
      },
      {
        'activities-heart': []
      },
      {
        'activities-heart-intraday': {
          dataset: []
        }
      },
      {
        weight: []
      },
      {
        fat: []
      },
      {
        value: {}
      },
      {
        br: []
      },
      'user-1',
      '2026-03-01'
    )

    expect(normalized).toBeNull()
  })

  it('returns null for invalid date input', () => {
    const normalized = normalizeFitbitWellness(
      {
        sleep: [
          {
            isMainSleep: true,
            minutesAsleep: 420
          }
        ]
      },
      { hrv: [] },
      { 'activities-heart': [] },
      { 'activities-heart-intraday': { dataset: [] } },
      { weight: [] },
      { fat: [] },
      { value: {} },
      { br: [] },
      'user-1',
      '2026-13-40'
    )

    expect(normalized).toBeNull()
  })
})
