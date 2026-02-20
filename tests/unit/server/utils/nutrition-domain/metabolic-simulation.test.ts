import { describe, expect, it } from 'vitest'
import {
  calculateGlycogenState,
  calculateEnergyTimeline,
  getConfiguredMealTime,
  parseMealDateTime
} from '../../../../../server/utils/nutrition-domain/metabolic-simulation'

describe('metabolic-simulation meal time handling', () => {
  it('returns null for date-only timestamps', () => {
    expect(parseMealDateTime('2026-02-20', '2026-02-20', 'UTC')).toBeNull()
  })

  it('resolves configured meal time using aliases', () => {
    const settings = {
      mealPattern: [
        { name: 'Morning Fuel', time: '07:30' },
        { name: 'Midday Meal', time: '12:45' },
        { name: 'Evening', time: '19:15' }
      ]
    }

    expect(getConfiguredMealTime('lunch', settings)).toBe('12:45')
  })

  it('falls back by index when names do not match', () => {
    const settings = {
      mealPattern: [
        { name: 'Slot 1', time: '06:30' },
        { name: 'Slot 2', time: '11:30' },
        { name: 'Slot 3', time: '18:30' },
        { name: 'Slot 4', time: '21:00' }
      ]
    }

    expect(getConfiguredMealTime('dinner', settings)).toBe('18:30')
  })

  it('falls back to default times when mealPattern is missing', () => {
    expect(getConfiguredMealTime('snacks', {})).toBe('15:00')
  })

  it('places Fitbit-style date-only meal logs at configured meal time in timeline', () => {
    const points = calculateEnergyTimeline(
      {
        date: '2026-02-20',
        carbsGoal: 180,
        breakfast: [
          {
            name: 'Fitbit Oatmeal',
            carbs: 42,
            protein: 8,
            fat: 5,
            calories: 250,
            date: '2026-02-20'
          }
        ],
        lunch: [],
        dinner: [],
        snacks: []
      },
      [],
      {
        mealPattern: [
          { name: 'Breakfast', time: '09:15' },
          { name: 'Lunch', time: '13:00' },
          { name: 'Dinner', time: '19:00' }
        ],
        bmr: 1600,
        metabolicFloor: 0.6,
        weight: 75
      },
      'UTC',
      undefined,
      { now: new Date('2026-02-20T23:00:00.000Z') }
    )

    const breakfastPoint = points.find((point) => point.time === '09:15')

    expect(breakfastPoint).toBeDefined()
    expect(breakfastPoint?.eventType).toBe('meal')
    expect(breakfastPoint?.event).toContain('Fitbit Oatmeal')
  })

  it('applies date-only meal fallback in calculateGlycogenState', () => {
    const result = calculateGlycogenState(
      {
        date: '2026-02-20',
        carbsGoal: 180,
        breakfast: [
          {
            name: 'Fitbit Oatmeal',
            carbs: 42,
            protein: 8,
            fat: 5,
            calories: 250,
            date: '2026-02-20'
          }
        ],
        lunch: [],
        dinner: [],
        snacks: []
      },
      [],
      {
        mealPattern: [
          { name: 'Breakfast', time: '09:15' },
          { name: 'Lunch', time: '13:00' },
          { name: 'Dinner', time: '19:00' }
        ],
        bmr: 1600,
        metabolicFloor: 0.6,
        weight: 75
      },
      'UTC',
      new Date('2026-02-20T23:00:00.000Z')
    )

    expect(result.breakdown.replenishment.actualCarbs).toBeGreaterThan(0)
    expect(result.breakdown.replenishment.targetCarbs).toBe(180)
  })
})
