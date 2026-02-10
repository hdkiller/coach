import { differenceInMinutes, startOfDay, endOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export interface GlycogenBreakdown {
  midnightBaseline: number
  replenishment: {
    value: number
    actualCarbs: number
    targetCarbs: number
  }
  depletion: Array<{
    title: string
    value: number
    intensity: number
    durationMin: number
  }>
}

export interface GlycogenResult {
  percentage: number
  advice: string
  state: number
  breakdown: GlycogenBreakdown
}

/**
 * Calculates the current glycogen "fuel tank" percentage based on:
 * 1. Base levels (restoration during sleep)
 * 2. Depletion from activities (Planned or Completed)
 * 3. Replenishment from logged nutrition
 */
export function calculateGlycogenState(
  nutritionRecord: any,
  workouts: any[],
  currentTime: Date = new Date()
): GlycogenResult {
  // 1. Establish Baselines
  // We assume the tank starts at 80% at midnight (after overnight restoration)
  const midnightBaseline = 80
  let percentage = midnightBaseline

  // Total daily goals (the "Fill" capacity for the day's demand)
  const targetCarbs = nutritionRecord.carbsGoal || 300
  const actualCarbs = nutritionRecord.carbs || 0

  // 2. Replenishment (The Fill)
  const replenishmentFactor = targetCarbs > 0 ? actualCarbs / targetCarbs : 0
  const replenishmentValue = Math.min(20, replenishmentFactor * 20) // Max 20% addition
  percentage += replenishmentValue

  // 3. Depletion (The Drain)
  const depletionEvents: GlycogenBreakdown['depletion'] = []
  let totalDepletion = 0

  workouts.forEach((workout) => {
    const workoutStart = new Date(workout.startTime || workout.date)
    const isCompleted = workout.source === 'completed'
    const isPlanned = workout.source === 'planned'

    // Intensity factor proxy
    const intensity = workout.intensity || workout.workIntensity || 0.7
    const durationMin = (workout.duration || workout.plannedDuration || 3600) / 60

    let drainPerHour = 20
    if (intensity > 0.85) drainPerHour = 45
    else if (intensity < 0.6) drainPerHour = 10

    const drainAmount = drainPerHour * (durationMin / 60)

    if (isCompleted || (isPlanned && workoutStart <= currentTime)) {
      totalDepletion += drainAmount
      depletionEvents.push({
        title: workout.title,
        value: Math.round(drainAmount),
        intensity,
        durationMin: Math.round(durationMin)
      })
    }
  })

  percentage -= totalDepletion

  // 4. Bounds Check
  percentage = Math.max(5, Math.min(100, Math.round(percentage)))

  // 5. Determine Advice & State
  let advice = ''
  let state = 1 // 1: Good, 2: Warning, 3: Critical

  if (percentage > 70) {
    advice = 'Energy levels high. Ready for intensity.'
    state = 1
  } else if (percentage > 35) {
    advice = 'Moderate depletion. Focus on replenishment.'
    state = 2
  } else {
    advice = 'CRITICAL: Refuel immediately to avoid metabolic crash.'
    state = 3
  }

  return {
    percentage,
    advice,
    state,
    breakdown: {
      midnightBaseline,
      replenishment: {
        value: Math.round(replenishmentValue),
        actualCarbs,
        targetCarbs
      },
      depletion: depletionEvents
    }
  }
}

export interface EnergyPoint {
  time: string
  timestamp: number
  level: number       // % capacity
  kcalBalance: number // +/- kcal relative to day start
  isFuture: boolean
  event?: string
  eventType?: 'workout' | 'meal'
  eventIcon?: string
}

/**
 * Simulates energy availability across a 24-hour window using physiological formulas.
 */
export function calculateEnergyTimeline(
  nutritionRecord: any,
  workouts: any[],
  settings: any,
  timezone: string
): EnergyPoint[] {
  const dateStr = nutritionRecord.date.split('T')[0]
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone)
  const now = new Date()

  const points: EnergyPoint[] = []
  const INTERVAL = 15 // minutes
  const TOTAL_POINTS = (24 * 60) / INTERVAL

  // 1. Athlete Constants
  const weight = settings?.user?.weight || 75
  const C_cap_grams = weight * 8 
  
  // 2. Initial State (Morning Baseline)
  // Start at 85% capacity at midnight
  let currentGrams = C_cap_grams * 0.85
  let currentKcalDelta = 0 // Starting point for the day

  // 3. Resting Drain (Brain/CNS)
  const dailyBmr = settings?.bmr || 1600
  const intervalRestDrainGrams = (dailyBmr * 0.6) / (4 * 96)
  const intervalRestDrainKcal = (dailyBmr * 1.2) / 96

  // 4. Prep Meals
  const meals: any[] = []
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks']
  const mealPattern = settings?.mealPattern || []

  mealTypes.forEach((type) => {
    if (Array.isArray(nutritionRecord[type])) {
      nutritionRecord[type].forEach((item: any) => {
        let mealTime: Date | null = null
        const timeVal = item.logged_at || item.date

        if (timeVal) {
          if (typeof timeVal === 'string' && /^\d{2}:\d{2}$/.test(timeVal)) {
            mealTime = fromZonedTime(`${dateStr}T${timeVal}:00`, timezone)
          } else {
            mealTime = new Date(timeVal)
          }
        } else {
          const pattern = mealPattern.find((p: any) => p.name.toLowerCase() === type.toLowerCase())
          if (pattern) {
            mealTime = fromZonedTime(`${dateStr}T${pattern.time}:00`, timezone)
          }
        }

        if (mealTime && !isNaN(mealTime.getTime())) {
          meals.push({
            time: mealTime,
            name: item.name,
            totalCarbs: item.carbs || 0,
            totalKcal: item.calories || 0,
            type: item.name?.toLowerCase().includes('gel') ? 'FAST' : 'MIXED'
          })
        }
      })
    }
  })

  // 5. Prep Workouts
  const workoutEvents = workouts.map((w) => {
    const start = new Date(w.startTime || w.date)
    const durationMin = (w.durationSec || 3600) / 60
    const intensity = w.intensityFactor || w.workIntensity || 0.7

    // Oxidation rate lookup (g/min)
    let gramsPerMin = 1.5
    if (intensity > 0.9) gramsPerMin = 4.5
    else if (intensity > 0.75) gramsPerMin = 3.0
    else if (intensity < 0.6) gramsPerMin = 0.8

    // Kcal burn
    const kcalPerMin = (gramsPerMin * 4) / 0.8 

    return {
      start,
      end: new Date(start.getTime() + durationMin * 60000),
      drainGramsPerInterval: gramsPerMin * INTERVAL,
      drainKcalPerInterval: kcalPerMin * INTERVAL,
      title: w.title,
      type: w.type
    }
  })

  // 6. Simulation Loop
  for (let i = 0; i <= TOTAL_POINTS; i++) {
    const currentTime = new Date(dayStart.getTime() + i * INTERVAL * 60000)

    // --- SUBTRACT DRAIN ---
    if (i > 0) {
      currentGrams -= intervalRestDrainGrams
      currentKcalDelta -= intervalRestDrainKcal
    }

    // --- SUBTRACT EXERCISE ---
    const activeWorkout = workoutEvents.find((w) => currentTime >= w.start && currentTime <= w.end)
    if (activeWorkout) {
      currentGrams -= activeWorkout.drainGramsPerInterval
      currentKcalDelta -= activeWorkout.drainKcalPerInterval
    }

    // --- ADD ABSORPTION ---
    let intervalGramsIn = 0
    let intervalKcalIn = 0
    let intervalEvent: any = null

    meals.forEach((meal) => {
      const minsSince = (currentTime.getTime() - meal.time.getTime()) / 60000
      if (minsSince >= 0) {
        if (meal.type === 'FAST') {
          if (minsSince <= 30) {
            const factor = INTERVAL / 30
            intervalGramsIn += meal.totalCarbs * factor
            intervalKcalIn += meal.totalKcal * factor
          }
        } else {
          const k = 0.08, t0 = 60
          const sigmoid = (t: number) => 1 / (1 + Math.exp(-k * (t - t0)))
          const delta = sigmoid(minsSince) - sigmoid(minsSince - INTERVAL)
          intervalGramsIn += meal.totalCarbs * delta
          intervalKcalIn += meal.totalKcal * delta
        }
      }
      
      if (minsSince >= 0 && minsSince < INTERVAL) {
        intervalEvent = { name: meal.name, type: 'meal', icon: 'i-tabler-tools-kitchen-2' }
      }
    })

    currentGrams += Math.min(intervalGramsIn, 22.5) 
    currentKcalDelta += intervalKcalIn

    currentGrams = Math.max(0, Math.min(C_cap_grams, currentGrams))
    
    if (activeWorkout && (currentTime.getTime() - activeWorkout.start.getTime()) < (INTERVAL * 60000)) {
       intervalEvent = { name: activeWorkout.title, type: 'workout', icon: 'i-tabler-bike' }
    }

    points.push({
      time: currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      timestamp: currentTime.getTime(),
      level: Math.round((currentGrams / C_cap_grams) * 100),
      kcalBalance: Math.round(currentKcalDelta),
      isFuture: currentTime > now,
      event: intervalEvent?.name,
      eventType: intervalEvent?.type,
      eventIcon: intervalEvent?.icon
    })
  }

  return points
}
