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
  level: number
  isFuture: boolean
  event?: string
  meal?: string
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

  // 1. Athlete Constants (Normalization)
  // Standard Capacity: Weight * mu (mu = 8g glycogen/kg for trained athletes)
  const weight = settings?.user?.weight || 75
  const C_cap = weight * 8 
  
  // 2. Initial State (Morning Baseline)
  // Simulation starts at 00:00. Start at 85% to allow for some drain before breakfast.
  let currentGrams = C_cap * 0.85

  // 3. Resting Drain (Brain/CNS)
  // Rdrain (g/15min) = (BMR * 0.60) / (4 * 96)
  const dailyBmr = settings?.bmr || 1600
  const intervalRestDrain = (dailyBmr * 0.6) / (4 * 96)

  // 4. Prep Meals with Delayed Absorption (Sigmoid for Mixed, Linear for Fast)
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
            type: item.name?.toLowerCase().includes('gel') ? 'FAST' : 'MIXED'
          })
        }
      })
    }
  })

  // 5. Prep Workouts with Oxidation Rates
  const workoutEvents = workouts.map((w) => {
    const start = new Date(w.startTime || w.date)
    const durationMin = (w.durationSec || 3600) / 60
    const intensity = w.intensityFactor || w.workIntensity || 0.7

    // Oxidation rate lookup (g/min)
    let gramsPerMin = 1.5 // Default Z2
    if (intensity > 0.9) gramsPerMin = 4.25 // Z4+
    else if (intensity > 0.75) gramsPerMin = 2.75 // Z3
    else if (intensity < 0.6) gramsPerMin = 0.75 // Z1

    return {
      start,
      end: new Date(start.getTime() + durationMin * 60000),
      drainPerInterval: gramsPerMin * INTERVAL,
      title: w.title
    }
  })

  // 6. Simulation Loop
  for (let i = 0; i <= TOTAL_POINTS; i++) {
    const currentTime = new Date(dayStart.getTime() + i * INTERVAL * 60000)

    // --- SUBTRACT DRAIN (Resting) ---
    if (i > 0) {
      currentGrams -= intervalRestDrain
    }

    // --- SUBTRACT EXERCISE ---
    const activeWorkout = workoutEvents.find((w) => currentTime >= w.start && currentTime <= w.end)
    if (activeWorkout) {
      currentGrams -= activeWorkout.drainPerInterval
    }

    // --- ADD ABSORPTION (The Refill) ---
    let intervalGramsIn = 0
    let intervalMealLabel = ''

    meals.forEach((meal) => {
      const minsSince = (currentTime.getTime() - meal.time.getTime()) / 60000
      if (minsSince >= 0) {
        if (meal.type === 'FAST') {
          // Linear ramp over 30 mins
          if (minsSince <= 30) {
            intervalGramsIn += meal.totalCarbs / (30 / INTERVAL)
          }
        } else {
          // Mixed Meal Sigmoid: A(t) = M_total / (1 + e^-k(t-t0))
          const k = 0.08
          const t0 = 60
          const sigmoid = (t: number) => 1 / (1 + Math.exp(-k * (t - t0)))
          const absorbedAtCurrent = sigmoid(minsSince)
          const absorbedAtPrev = sigmoid(minsSince - INTERVAL)
          intervalGramsIn += meal.totalCarbs * (absorbedAtCurrent - absorbedAtPrev)
        }
      }
      
      // Marker detection
      if (minsSince >= 0 && minsSince < INTERVAL) {
        intervalMealLabel = meal.name
      }
    })

    // Cap Absorption (max 90g/hr = 22.5g/15min)
    currentGrams += Math.min(intervalGramsIn, 22.5)

    // Bounds check
    currentGrams = Math.max(0, Math.min(C_cap, currentGrams))
    const levelPercentage = Math.round((currentGrams / C_cap) * 100)

    points.push({
      time: currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      timestamp: currentTime.getTime(),
      level: levelPercentage,
      isFuture: currentTime > now,
      event: activeWorkout?.title,
      meal: intervalMealLabel || undefined
    })
  }

  return points
}
