import { differenceInMinutes, startOfDay, endOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getWorkoutDate } from './nutrition-timeline'

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
  restingMetabolism?: number
}

export interface GlycogenResult {
  percentage: number
  advice: string
  state: number
  breakdown: GlycogenBreakdown
}

export function getGramsPerMin(intensity: number): number {
  if (intensity >= 0.9) return 4.5
  if (intensity >= 0.75) return 2.75
  if (intensity < 0.6) return 0.75
  return 1.5
}

export function calculateGlycogenState(
  nutritionRecord: any,
  workouts: any[],
  settings: any,
  timezone: string,
  currentTime: Date = new Date()
): GlycogenResult {
  const midnightBaseline = 85 // Aligned with calculateEnergyTimeline (0.85)
  let percentage = midnightBaseline

  const targetCarbs = nutritionRecord.carbsGoal || 300

  // Only count meals that have occurred/been logged until now
  let absorbedUntilNow = 0
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks']
  const dateStr = nutritionRecord.date.split('T')[0]

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
        }

        if (mealTime && mealTime <= currentTime) {
          absorbedUntilNow += item.carbs || 0
        }
      })
    }
  })

  // Fallback to the total record count if no meal breakdown is available (e.g., partial data)
  const actualCarbs = absorbedUntilNow || nutritionRecord.carbs || 0

  const replenishmentFactor = targetCarbs > 0 ? actualCarbs / targetCarbs : 0
  const replenishmentValue = Math.min(20, replenishmentFactor * 20)
  percentage += replenishmentValue

  const weight = settings?.weight || settings?.user?.weight || 75
  const C_cap = weight * 8

  // Calculate BMR drain since midnight
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone)
  const minsSinceMidnight = differenceInMinutes(currentTime, dayStart)
  const dailyBmr = settings?.bmr || 1600
  const gramsDrainedBmr = ((dailyBmr * 0.4) / 4) * (minsSinceMidnight / 1440)
  const bmrPctDrop = (gramsDrainedBmr / C_cap) * 100
  percentage -= bmrPctDrop

  const depletionEvents: GlycogenBreakdown['depletion'] = []
  let totalDepletion = 0

  workouts.forEach((workout) => {
    const workoutStart = new Date(getWorkoutDate(workout, timezone))
    const isCompleted = workout.source === 'completed' || workout.completed === true

    const intensity = workout.intensity || workout.workIntensity || 0.7
    const durationMin =
      (workout.duration || workout.durationSec || workout.plannedDuration || 3600) / 60

    const gramsPerMin = getGramsPerMin(intensity) * 1.25
    const drainGramsTotal = gramsPerMin * durationMin
    const drainAmount = (drainGramsTotal / C_cap) * 100

    // Count if completed OR if planned and its start time has passed
    if (isCompleted || workoutStart <= currentTime) {
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
  percentage = Math.max(5, Math.min(100, Math.round(percentage)))

  let advice = ''
  let state = 1

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
      depletion: depletionEvents,
      restingMetabolism: Math.round(bmrPctDrop)
    }
  }
}

export interface EnergyPoint {
  time: string
  timestamp: number
  level: number
  kcalBalance: number
  isFuture: boolean
  event?: string
  eventType?: 'workout' | 'meal'
  eventIcon?: string
}

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
  const INTERVAL = 15
  const TOTAL_POINTS = (24 * 60) / INTERVAL

  const weight = settings?.user?.weight || 75
  const C_cap = weight * 8

  let currentGrams = C_cap * 0.85
  let cumulativeKcalDelta = 0

  const dailyBmr = settings?.bmr || 1600
  const intervalRestDrainGrams = (dailyBmr * 0.4) / (4 * 96)
  const intervalRestDrainKcal = (dailyBmr * 1.2) / 96

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
            totalKcal:
              item.calories ||
              (item.carbs || 0) * 4 + (item.protein || 0) * 4 + (item.fat || 0) * 9,
            type: item.name?.toLowerCase().includes('gel') ? 'FAST' : 'MIXED'
          })
        }
      })
    }
  })

  const workoutEvents = workouts.map((w) => {
    const start = new Date(getWorkoutDate(w, timezone))
    const durationMin = (w.durationSec || w.plannedDuration || 3600) / 60
    const intensity = w.workIntensity || w.intensityFactor || w.intensity || 0.7

    const gramsPerMin = getGramsPerMin(intensity)

    return {
      start,
      end: new Date(start.getTime() + durationMin * 60000),
      drainGramsPerInterval: gramsPerMin * INTERVAL,
      drainKcalPerInterval: ((gramsPerMin * 4) / 0.8) * INTERVAL,
      title: w.title
    }
  })

  for (let i = 0; i <= TOTAL_POINTS; i++) {
    const currentTime = new Date(dayStart.getTime() + i * INTERVAL * 60000)

    const intervalEvents: any[] = []

    // Check for workouts in this interval
    workoutEvents.forEach((w) => {
      const msDiff = Math.abs(currentTime.getTime() - w.start.getTime())
      if (msDiff < (INTERVAL * 60000) / 2) {
        intervalEvents.push({ name: w.title, type: 'workout', icon: 'i-tabler-bike' })
      }
    })

    // Check for meals in this interval
    meals.forEach((m) => {
      const msDiff = Math.abs(currentTime.getTime() - m.time.getTime())
      if (msDiff < (INTERVAL * 60000) / 2) {
        intervalEvents.push({ name: m.name, type: 'meal', icon: 'i-tabler-tools-kitchen-2' })
      }
    })

    const activeWorkout = workoutEvents.find((w) => currentTime >= w.start && currentTime < w.end)
    const hasEvents = intervalEvents.length > 0
    const primaryType = intervalEvents.find((e) => e.type === 'workout') ? 'workout' : 'meal'
    const combinedName = intervalEvents.map((e) => e.name).join(' + ')

    points.push({
      time: `${currentTime.getUTCHours().toString().padStart(2, '0')}:${currentTime.getUTCMinutes().toString().padStart(2, '0')}`,
      timestamp: currentTime.getTime(),
      level: Math.round((currentGrams / C_cap) * 100),
      kcalBalance: Math.round(cumulativeKcalDelta),
      isFuture: currentTime > now,
      event: hasEvents ? combinedName : undefined,
      eventType: hasEvents ? primaryType : undefined,
      eventIcon: hasEvents
        ? intervalEvents.length > 1
          ? 'i-tabler-layers-intersect'
          : intervalEvents[0].icon
        : undefined
    })

    if (i < TOTAL_POINTS) {
      currentGrams -= intervalRestDrainGrams
      cumulativeKcalDelta -= intervalRestDrainKcal

      if (activeWorkout) {
        const drop = activeWorkout.drainGramsPerInterval * 1.25
        if (process.env.NODE_ENV === 'test') {
          console.log(
            `[SimLog] i=${i} ${currentTime.toISOString()} matches ${activeWorkout.title}. Applying -${drop.toFixed(1)}g`
          )
        }
        currentGrams -= drop
        cumulativeKcalDelta -= activeWorkout.drainKcalPerInterval
      }

      let intervalGramsIn = 0
      let intervalKcalIn = 0
      meals.forEach((meal) => {
        const minsSince = (currentTime.getTime() - meal.time.getTime()) / 60000 + INTERVAL
        if (minsSince >= 0) {
          if (meal.type === 'FAST') {
            if (minsSince <= 30) {
              const factor = INTERVAL / 30
              intervalGramsIn += meal.totalCarbs * factor * 1.5
              intervalKcalIn += meal.totalKcal * factor
            }
          } else {
            const k = 0.12,
              t0 = 45
            const sigmoid = (t: number) => 1 / (1 + Math.exp(-k * (t - t0)))
            const delta = sigmoid(minsSince) - sigmoid(minsSince - INTERVAL)
            intervalGramsIn += meal.totalCarbs * delta * 1.5
            intervalKcalIn += meal.totalKcal * delta
          }
        }
      })

      currentGrams += Math.min(intervalGramsIn, 25.0)
      cumulativeKcalDelta += intervalKcalIn
      currentGrams = Math.max(0, Math.min(C_cap, currentGrams))
    }
  }

  return points
}
