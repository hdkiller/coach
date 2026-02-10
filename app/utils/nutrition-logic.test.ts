import { describe, it, expect, vi } from 'vitest'
import { calculateEnergyTimeline } from './nutrition-logic'

// Mock date-fns-tz as it can be tricky in test environments
vi.mock('date-fns-tz', () => ({
  fromZonedTime: (date: string | Date, tz: string) => new Date(date),
  toZonedTime: (date: string | Date, tz: string) => new Date(date)
}))

describe('calculateEnergyTimeline', () => {
  const mockSettings = {
    bmr: 1800,
    mealPattern: [
      { name: 'Breakfast', time: '08:00' },
      { name: 'Lunch', time: '12:00' },
      { name: 'Dinner', time: '19:00' }
    ]
  }

  const mockNutrition = {
    date: '2026-02-10T00:00:00Z',
    carbsGoal: 400,
    breakfast: [
      { name: 'Oatmeal', carbs: 100, logged_at: '2026-02-10T08:00:00Z' }
    ],
    lunch: [],
    dinner: [],
    snacks: []
  }

  it('should start at 80% and not drain to 5% immediately', () => {
    const points = calculateEnergyTimeline(mockNutrition, [], mockSettings, 'UTC')
    
    // Start of day
    expect(points[0]?.level).toBe(80)
    
    // Check at 4:00 AM (after 4 hours of BMR drain)
    // 1800 BMR * 1.2 / 24 = 90 kcal/hr
    // 4 hours = 360 kcal
    // 360 / 2000 capacity = 18% drain
    // 80% - 18% = 62%
    const fourAm = points.find(p => p.time === '04:00')
    expect(fourAm?.level).toBeGreaterThan(50)
  })

  it('should show replenishment after a meal', () => {
    const points = calculateEnergyTimeline(mockNutrition, [], mockSettings, 'UTC')
    
    const sevenAm = points.find(p => p.time === '07:45')
    const nineAm = points.find(p => p.time === '09:00')
    
    // Level at 9:00 should be higher than at 7:45 because of breakfast absorption
    expect(nineAm!.level).toBeGreaterThan(sevenAm!.level)
  })

  it('should show depletion after a workout', () => {
    const mockWorkouts = [
      {
        title: 'Morning Intervals',
        startTime: '2026-02-10T10:00:00Z',
        durationSec: 3600, // 1 hour
        workIntensity: 0.85
      }
    ]
    
    const points = calculateEnergyTimeline(mockNutrition, mockWorkouts, mockSettings, 'UTC')
    
    const beforeWorkout = points.find(p => p.time === '09:45')
    const afterWorkout = points.find(p => p.time === '11:15')
    
    expect(afterWorkout!.level).toBeLessThan(beforeWorkout!.level)
  })
})
