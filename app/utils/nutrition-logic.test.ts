import { describe, it, expect, vi } from 'vitest'
import { calculateEnergyTimeline } from './nutrition-logic'

// Mock date-fns-tz
vi.mock('date-fns-tz', () => ({
  fromZonedTime: (date: string | Date, tz: string) => new Date(date),
  toZonedTime: (date: string | Date, tz: string) => new Date(date)
}))

describe('calculateEnergyTimeline', () => {
  const mockSettings = {
    bmr: 1800,
    user: { weight: 70 }, // mu = 8 -> 560g capacity
    mealPattern: [{ name: 'Breakfast', time: '08:00' }]
  }

  const mockNutrition = {
    date: '2026-02-10T00:00:00Z',
    carbsGoal: 400,
    breakfast: [
      { name: 'Big Bowl of Porridge', carbs: 100, calories: 500, logged_at: '2026-02-10T08:00:00Z' }
    ],
    lunch: [],
    dinner: [],
    snacks: []
  }

  it('should start at 85% and have a realistic resting drain', () => {
    const points = calculateEnergyTimeline(mockNutrition, [], mockSettings, 'UTC')

    // Start of day
    expect(points[0]?.level).toBe(85)

    // Check at 4:00 AM (after 4 hours)
    // Rdrain = (1800 * 0.6) / (4 * 96) = 2.8125g / 15min = 11.25g / hr
    // 4 hours = 45g.
    // Capacity = 560g. 45/560 = 8% drop.
    // 85% - 8% = 77%
    const fourAm = points.find((p) => p.time === '04:00')
    expect(fourAm?.level).toBeCloseTo(77, 0)
  })

  it('should show replenishment with an S-curve (Sigmoid)', () => {
    const points = calculateEnergyTimeline(mockNutrition, [], mockSettings, 'UTC')

    const atMeal = points.find((p) => p.time === '08:00')
    const oneHourAfter = points.find((p) => p.time === '09:00')
    const twoHoursAfter = points.find((p) => p.time === '10:00')

    // replenishment should be positive
    expect(oneHourAfter!.level).toBeGreaterThan(atMeal!.level)
    expect(twoHoursAfter!.level).toBeGreaterThan(oneHourAfter!.level)

    // At 10:00 (120 mins after), most of 100g should be absorbed
    // 100g is ~18% of 560g capacity.
    // Plus BMR drain (approx 2% in 2 hours).
    // Net gain should be roughly 15-16%
    expect(twoHoursAfter!.level - atMeal!.level).toBeGreaterThan(10)
  })

  it('should show steep depletion for high intensity workout', () => {
    const mockWorkouts = [
      {
        title: 'Threshold Intervals',
        startTime: '2026-02-10T11:00:00Z',
        durationSec: 3600, // 1 hour
        workIntensity: 0.95 // Z4
      }
    ]

    const points = calculateEnergyTimeline(mockNutrition, mockWorkouts, mockSettings, 'UTC')

    const beforeWorkout = points.find((p) => p.time === '11:00')
    const afterWorkout = points.find((p) => p.time === '12:00')

    console.log('[TestDebug] Level Before:', beforeWorkout?.level)
    console.log('[TestDebug] Level After:', afterWorkout?.level)
    console.log('[TestDebug] Total Drop:', (beforeWorkout?.level || 0) - (afterWorkout?.level || 0))

    // Z4 oxidation is ~4.5g/min = 67.5g / 15min = 270g / hr.
    // 270 / 560 capacity = ~48% drop.
    expect(beforeWorkout!.level - afterWorkout!.level).toBeGreaterThan(40)
  })
})
